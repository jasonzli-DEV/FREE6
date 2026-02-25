import { handleVoiceState } from '../plugins/tempChannels/handler.js';

export const name = 'voiceStateUpdate';

export async function execute(oldState, newState) {
  await handleVoiceState(oldState, newState);
}
