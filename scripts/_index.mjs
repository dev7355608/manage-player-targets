import onSocketEvent from "./socket.mjs";
import TokenHUDMixin from "./token-hud.mjs";

Hooks.once("setup", () => {
    if (game.settings.get("core", "noCanvas")) {
        return;
    }

    game.socket.on("module.manage-player-targets", onSocketEvent);

    if (!game.user.isGM) {
        return;
    }

    CONFIG.Token.hudClass = TokenHUDMixin(CONFIG.Token.hudClass);
});
