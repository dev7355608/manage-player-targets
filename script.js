Hooks.once("setup", () => {
    if (game.settings.get("core", "noCanvas")) {
        return;
    }

    game.socket.on("module.manage-player-targets", ({ sceneId, tokenIds, mode }) => {
        if (sceneId === canvas.scene?.id) {
            canvas.tokens.setTargets(tokenIds, { mode });
        }
    });

    if (!game.user.isGM) {
        return;
    }

    CONFIG.Token.hudClass = class extends CONFIG.Token.hudClass {
        /** @override */
        static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
            actions: {
                "target": this.#onToggleTargetTray,
                "manage-player-targets--target": this.#onToggleTarget,
            },
        });

        /** @type {boolean} */
        #targetTrayActive = false;

        /** @override */
        bind(object) {
            this.#targetTrayActive = false;

            return super.bind(object);
        }

        /** @override */
        async _renderHTML(context, options) {
            const result = await super._renderHTML(context, options);

            const users = game.users.filter((user) => user.isSelf || user.active && user.viewedScene === canvas.scene?.id).map((user) => ({
                id: user.id,
                name: user.name,
                color: user.color.css,
                border: user.border.css,
                targeting: user.targets.has(this.object),
            })).sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

            result.hud.querySelector(`.control-icon[data-action="target"]`).insertAdjacentHTML("afterend", `
                <div class="manage-player-targets--player-list">
                    ${users.map((user) => `
                    <button type="button" class="manage-player-targets--player ${user.targeting ? "active" : ""}"
                        style="--player-color: ${user.color}; --player-border: ${user.border}"
                        data-action="manage-player-targets--target" data-user-id="${user.id}">
                        <span class="manage-player-targets--player-name ellipsis">${Handlebars.Utils.escapeExpression(user.name)}</span>
                    </button>`).join("")}
                </div>
            `);

            return result;
        }

        /** @override */
        async _onRender(context, options) {
            await super._onRender(context, options);

            this.#toggleTargetTray(this.#targetTrayActive);
        }

        /** @override */
        toggleStatusTray(active) {
            super.toggleStatusTray(active);

            active ??= this.element.querySelector(".status-effects").classList.contains("active");

            if (active) {
                this.#toggleTargetTray(false);
            }
        }

        /**
         * Toggle the expanded state of the target selection tray.
         * @param {boolean} [active] - Force the status tray to be active or inactive.
         */
        #toggleTargetTray(active) {
            this.#targetTrayActive = active ??= !this.#targetTrayActive;

            const target = this.element.querySelector(`.control-icon[data-action="target"]`);
            const playerList = this.element.querySelector(`.manage-player-targets--player-list`);

            target.classList.toggle("active", active);
            playerList.classList.toggle("active", active);

            if (active) {
                playerList.style.top = `${target.offsetTop + target.offsetHeight / 2 - playerList.offsetHeight / 2}px`;

                this.toggleStatusTray(false);
            }
        }

        /**
         * @this
         * @param {PointerEvent} event
         * @param {HTMLButtonElement} target
         */
        static #onToggleTargetTray(event, target) {
            this.#toggleTargetTray(!this.#targetTrayActive);
        }

        /**
         * @this
         * @param {PointerEvent} event
         * @param {HTMLButtonElement} target
         */
        static #onToggleTarget(event, target) {
            const token = this.object;
            const tokens = token.controlled ? token.layer.controlled : [token, ...token.layer.controlled];
            const tokenIds = tokens.map((token) => token.document.id);
            const mode = target.classList.toggle("active") ? "acquire" : "release";
            const userId = target.dataset.userId;

            if (userId === game.user.id) {
                canvas.tokens.setTargets(tokenIds, { mode });
            } else {
                game.socket.emit("module.manage-player-targets", { sceneId: canvas.scene.id, tokenIds, mode }, { recipients: [userId] });
            }
        }
    };
});
