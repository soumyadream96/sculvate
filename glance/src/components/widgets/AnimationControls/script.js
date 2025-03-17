import { mapState, mapActions } from 'vuex';

export default {
  name: 'AnimationControls',
  computed: {
    ...mapState('animations', {
      playing: (state) => state.playing,
      currentFrame: (state) => state.currentFrame,
      frames: (state) => state.frames,
    }),
    isOnFirstFrame() {
      return this.frames.length > 0 && this.currentFrame === this.frames[0];
    },
    isOnLastFrame() {
      return (
        this.frames.length > 0 &&
        this.currentFrame === this.frames[this.frames.length - 1]
      );
    },
    transformedCurrentFrame() {
      return `${Math.round(this.currentFrame * 17.1)}°`;
    },
    transformedFrames() {
      return this.frames.map((frame) => `${Math.round(frame * 17.1)}°`);
    },
  },
  methods: {
    setCurrentFrame(value) {
      // Remove the degree symbol and divide by 17.1 to get original value
      const originalValue = Math.round(Number(value.replace('°', '')) / 17.1);
      this.setFrameIndex(this.frames.indexOf(originalValue));
    },
    ...mapActions('animations', [
      'play',
      'pause',
      'nextFrame',
      'previousFrame',
      'firstFrame',
      'lastFrame',
      'setFrameIndex',
    ]),
  },
};
