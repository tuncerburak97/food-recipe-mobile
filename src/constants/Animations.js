export default {
  durations: {
    fast: 300,
    normal: 500,
    slow: 800,
  },

  delays: {
    short: 100,
    medium: 200,
    long: 400,
  },

  types: {
    fadeIn: {
      from: {
        opacity: 0,
      },
      to: {
        opacity: 1,
      },
    },
    slideUp: {
      from: {
        translateY: 20,
        opacity: 0,
      },
      to: {
        translateY: 0,
        opacity: 1,
      },
    },
    slideDown: {
      from: {
        translateY: -20,
        opacity: 0,
      },
      to: {
        translateY: 0,
        opacity: 1,
      },
    },
    scaleIn: {
      from: {
        scale: 0.9,
        opacity: 0,
      },
      to: {
        scale: 1,
        opacity: 1,
      },
    },
  },
};
