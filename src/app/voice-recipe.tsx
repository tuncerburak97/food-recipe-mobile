import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { WizardLayout } from '@/components/ui/wizard-layout';
import { confirmAction } from '@/components/voice/confirm';
import { ProcessStep } from '@/components/voice/process-step';
import { RecordStep } from '@/components/voice/record-step';
import { TellerStep } from '@/components/voice/teller-step';
import { useVoiceRecorder } from '@/components/voice/use-voice-recorder';
import { VoiceCard } from '@/components/voice/voice-card';
import type { Stage, StageState } from '@/components/voice/voice-stages';
import { ApiError } from '@/lib/api';
import {
  MIN_RECORDING_SEC,
  lengthLabel,
  newClientId,
  retryVoiceJob,
  setVoiceJob,
  tellerTitle,
  uploadVoiceRecipe,
  useVoiceJob,
  voiceErrorText,
  type Recording,
} from '@/lib/voice-recipe';
import { showToast } from '@/store/toast';

type Step = 'teller' | 'record' | 'process';
const STEPS: Step[] = ['teller', 'record', 'process'];
const FLOW = 'Sesle tarif';

/** Failures that another try with the same recording cannot fix: record again instead. */
const RECORD_AGAIN = new Set(['NO_SPEECH', 'NOT_A_RECIPE', 'NO_RECIPE_TEXT', 'AUDIO_TOO_LARGE', 'UNSUPPORTED_AUDIO']);

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * "Annemin tarifi": who tells the recipe, the recording, then the recipe is written down from it in
 * the background and opens when ready. The recording is kept on the recipe page.
 */
export default function VoiceRecipeScreen() {
  const client = useQueryClient();
  const rec = useVoiceRecorder();
  const [step, setStep] = useState<Step>('teller');
  const [forward, setForward] = useState(true);
  const [preset, setPreset] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [title, setTitle] = useState('');
  const [recording, setRecording] = useState<Recording | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const job = useVoiceJob(jobId).data;

  const teller = custom.trim() || preset || '';
  const index = STEPS.indexOf(step);
  const go = (to: Step) => {
    setForward(STEPS.indexOf(to) > index);
    setStep(to);
  };

  // The recipe is ready: open it in place of this screen.
  const readyEntry = job?.status === 'done' ? job.entry_id : null;
  useEffect(() => {
    if (readyEntry == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    client.invalidateQueries({ queryKey: ['recipes'] });
    client.invalidateQueries({ queryKey: ['me'] });
    router.replace(`/recipe/${readyEntry}`);
  }, [readyEntry, client]);

  const failedAt = job?.status === 'failed' ? job.finished_at : null;
  useEffect(() => {
    if (failedAt) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [failedAt]);

  // ---- closing ----

  const inFlight = jobId != null && job?.status !== 'failed';
  const unsaved = rec.phase !== 'idle' || (recording != null && !inFlight);

  const close = () => {
    if (inFlight) {
      showToast({ title: 'Tarifin hazırlanıyor', message: 'Hazır olunca Tariflerim’de bulacaksın.' });
      leave();
      return;
    }
    if (!unsaved) {
      leave();
      return;
    }
    confirmAction('Kayıt silinsin mi?', 'Bu kayıttan henüz tarif hazırlanmadı. Çıkarsan kayıt kaybolur.', 'Sil ve çık', () => {
      rec.discard().finally(leave);
    });
  };

  const back = () => {
    if (step === 'record') {
      if (rec.phase === 'recording') rec.pause();
      go('teller');
    } else close();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  // ---- recording ----

  const toggleRecording = async () => {
    setTooShort(false);
    if (rec.phase === 'idle') await rec.start();
    else if (rec.phase === 'recording') rec.pause();
    else rec.resume();
  };

  const finish = async () => {
    if (rec.seconds < MIN_RECORDING_SEC) {
      setTooShort(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setTooShort(false);
    const r = await rec.finish();
    if (!r) return;
    setRecording(r);
    setClientId(newClientId());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const recordAgain = () => {
    setRecording(null);
    setClientId(null);
    setJobId(null);
    setSendError(null);
    setTooShort(false);
    go('record');
  };

  const confirmRecordAgain = () =>
    confirmAction('Yeniden kaydedilsin mi?', 'Bu kayıt silinir, tarifi baştan kaydedersin.', 'Yeniden kaydet', recordAgain);

  // ---- sending ----

  const send = async () => {
    if (!recording || !clientId) return;
    setSending(true);
    setSendError(null);
    setAttempt((a) => a + 1);
    try {
      const j = jobId
        ? await retryVoiceJob(jobId)
        : await uploadVoiceRecipe(recording, { teller, title: title.trim(), clientId });
      setVoiceJob(client, j);
      setJobId(j.id);
    } catch (e) {
      setSendError(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  const prepare = () => {
    go('process');
    send();
  };

  // ---- step 3 ----

  if (step === 'process') {
    const jobFailed = job?.status === 'failed';
    const uploadState: StageState = !jobId ? (sendError ? 'failed' : 'active') : 'done';
    const heard = job?.status === 'done' || job?.stage === 'structuring';
    const transcribeState: StageState = !jobId ? 'todo' : heard ? 'done' : jobFailed ? 'failed' : 'active';
    const structureState: StageState =
      job?.status === 'done' ? 'done' : !jobId || !heard ? 'todo' : jobFailed ? 'failed' : 'active';
    const stages: Stage[] = [
      { label: 'Kayıt gönderiliyor', hint: 'Kaydın güvenle saklanıyor', state: uploadState },
      { label: 'Ses yazıya dökülüyor', hint: 'Anlatılanlar kelime kelime yazılıyor', state: transcribeState },
      { label: 'Tarif düzenleniyor', hint: 'Malzemeler, ölçüler ve adımlar ayıklanıyor', state: structureState },
    ];
    // A failed retry call keeps the job's own failure in view underneath; its message comes first.
    const code = sendError instanceof ApiError ? sendError.code : jobFailed ? job?.error?.code : undefined;
    const error = sendError
      ? voiceErrorText(sendError)
      : jobFailed
        ? { title: 'Bir sorun oldu', message: job?.error?.message || 'Tarif hazırlanırken bir sorun oldu. Kaydın duruyor, tekrar deneyebilirsin.' }
        : null;
    const fresh = code != null && RECORD_AGAIN.has(code);

    let footer: React.ReactNode;
    if (error && fresh) {
      footer = (
        <>
          <Button title="Yeniden kaydet" icon="mic-outline" onPress={recordAgain} />
          <Button title="Kapat" variant="ghost" size="md" onPress={close} />
        </>
      );
    } else if (error) {
      footer = (
        <>
          <Button title="Tekrar dene" icon="refresh" loading={sending} onPress={send} />
          <Button title="Kapat" variant="ghost" size="md" disabled={sending} onPress={close} />
        </>
      );
    } else if (inFlight) {
      footer = <Button title="Arka planda devam etsin" variant="secondary" onPress={close} />;
    } else {
      footer = <Button title="Vazgeç" variant="ghost" size="md" onPress={close} />;
    }

    return (
      <ProcessStep
        flow={FLOW}
        step={3}
        totalSteps={STEPS.length}
        teller={teller}
        durationSec={recording?.durationSec ?? 0}
        stages={stages}
        error={error}
        uploaded={inFlight}
        attempt={attempt}
        onClose={close}
        footer={footer}
      />
    );
  }

  // ---- steps 1 and 2 ----

  const heading =
    step === 'teller'
      ? { title: 'Tarifi kim anlatıyor?', hint: 'Tarif sayfasında “Annem anlatıyor” gibi görünür. İstersen boş bırakabilirsin.' }
      : recording
        ? { title: 'Kayıt hazır', hint: 'İstersen bir dinle. Tarif bu kayıttan hazırlanacak, ses de tarifinle saklanacak.' }
        : { title: 'Tarifi anlatsın, sen kaydet', hint: 'Telefonu anlatan kişiye yakın tut. Yazıya dökmeyi biz yaparız.' };

  const next =
    step === 'teller'
      ? { label: 'Devam', onPress: () => go('record') }
      : recording
        ? { label: 'Tarifi hazırla', onPress: prepare, icon: 'sparkles-outline' as const }
        : { label: 'Bitir', onPress: finish, icon: null, disabled: rec.phase === 'idle' || rec.permission === 'blocked' };

  const summary =
    step === 'teller'
      ? teller
        ? tellerTitle(teller)
        : 'İkisi de isteğe bağlı'
      : recording
        ? `${lengthLabel(recording.durationSec)} kayıt`
        : rec.phase === 'idle'
          ? 'Kayda başlamak için mikrofona dokun'
          : 'Anlatması bitince “Bitir”e dokun';

  return (
    <WizardLayout
      flow={FLOW}
      title={heading.title}
      hint={heading.hint}
      step={index + 1}
      totalSteps={STEPS.length}
      onBack={back}
      onClose={close}
      forward={forward}
      modal
      summary={summary}
      next={next}>
      {step === 'teller' ? (
        <TellerStep
          preset={preset}
          custom={custom}
          title={title}
          onPreset={(t) => {
            setPreset(t);
            setCustom('');
          }}
          onCustom={(name) => {
            setCustom(name);
            if (name.trim()) setPreset(null);
          }}
          onTitle={setTitle}
        />
      ) : recording ? (
        <Animated.View key={recording.uri} entering={FadeIn.duration(240)} style={styles.review}>
          <VoiceCard
            teller={teller}
            subtitle={`Tarif sayfasında böyle duracak · ${lengthLabel(recording.durationSec)}`}
            durationSec={recording.durationSec}
            waveform={recording.waveform}
            load={async () => ({ source: { uri: recording.uri } })}
          />
          <Text variant="footnote" color="textSecondary">
            Kayıt sadece senin tariflerinde durur; başkaları dinleyemez.
          </Text>
          <Button title="Yeniden kaydet" icon="mic-outline" variant="ghost" size="md" onPress={confirmRecordAgain} style={styles.again} />
        </Animated.View>
      ) : (
        <RecordStep rec={rec} onToggle={toggleRecording} tooShort={tooShort} />
      )}
    </WizardLayout>
  );
}

const styles = StyleSheet.create({
  review: { gap: 16 },
  again: { alignSelf: 'center' },
});
