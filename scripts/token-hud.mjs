/**
 * @type {(Token: typeof foundry.applications.hud.TokenHUD) => typeof foundry.applications.hud.TokenHUD}
 */
export default (TokenHUD) => class extends TokenHUD {
    /** @override */
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
        actions: {
            "target": { handler: this.#onToggleTargetPalette, buttons: [0, 2] },
            "manage-player-targets.target": this.#onToggleTargetState,
        },
    }, { inplace: false });

    /** @override */
    async _renderHTML(context, options) {
        const result = await super._renderHTML(context, options);

        const div = document.createElement("div");

        div.classList.add("palette");
        div.dataset.palette = "manage-player-targets.targets";

        const users = game.users.filter((user) => user.isSelf || user.active && user.viewedScene === canvas.scene?.id);

        users.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

        for (const user of users) {
            const a = document.createElement("a");

            a.classList.add("flexrow");
            a.classList.toggle("active", user.targets.has(this.object));
            a.style.setProperty("--user-color", user.color.css);
            a.style.setProperty("--user-border", user.border.css);
            a.dataset.action = "manage-player-targets.target";
            a.dataset.userId = user.id;

            const span = document.createElement("span");

            span.classList.add("ellipsis");
            span.textContent = user.name;

            a.append(span);
            div.append(a);
        }

        const button = result.hud.querySelector(`.control-icon[data-action="target"]`);

        button.classList.remove("active");
        button.dataset.palette = "manage-player-targets.targets";
        button.insertAdjacentElement("afterend", div);

        return result;
    }

    /**
     * @param {string} userId
     */
    #toggleTargetState(userId) {
        const token = this.object;
        const tokens = token.controlled ? token.layer.controlled : [token, ...token.layer.controlled];
        const tokenIds = tokens.map((token) => token.document.id);
        const target = this.element.querySelector(`.palette[data-palette="manage-player-targets.targets"] > a[data-user-id="${userId}"]`);
        const mode = target.classList.toggle("active") ? "acquire" : "release";

        if (userId === game.user.id) {
            canvas.tokens.setTargets(tokenIds, { mode });
        } else {
            game.socket.emit("module.manage-player-targets", { sceneId: canvas.scene.id, tokenIds, mode }, { recipients: [userId] });
        }
    }

    /**
     * @this
     * @param {PointerEvent} event
     * @param {HTMLButtonElement} target
     */
    static #onToggleTargetPalette(event, target) {
        if (event.button === 2) {
            this.#toggleTargetState(game.user.id);
        } else {
            this.togglePalette("manage-player-targets.targets");
        }
    }

    /**
     * @this
     * @param {PointerEvent} event
     * @param {HTMLButtonElement} target
     */
    static #onToggleTargetState(event, target) {
        this.#toggleTargetState(target.dataset.userId);
    }
};
