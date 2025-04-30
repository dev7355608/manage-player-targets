/**
 * @param {object} event
 * @param {string} event.sceneId
 * @param {string[]} event.tokenIds
 * @param {"replace"|"acquire"|"release"} event.mode
 */
export default function onSocketEvent({ sceneId, tokenIds, mode }) {
    if (sceneId === canvas.scene?.id) {
        canvas.tokens.setTargets(tokenIds, { mode });
    }
}
