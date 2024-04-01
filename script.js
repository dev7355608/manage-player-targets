Hooks.once("init", () => {
    function setup() {
        if (game.settings.get("core", "noCanvas")) {
            return;
        }

        game.socket.on("module.manage-player-targets", ({ sceneId, tokenIds, targeted }) => {
            if (sceneId !== canvas.scene?.id) {
                return;
            }

            for (const id of tokenIds) {
                const token = canvas.tokens.get(id);

                token?.setTarget(targeted, { releaseOthers: false, groupSelection: true });
            }

            game.user.broadcastActivity({ targets: game.user.targets.ids });
        });

        if (!game.user.isGM) {
            return;
        }

        if (foundry.utils.isNewerVersion(game.version, 12)) {
            CONFIG.Token.hudClass = class extends CONFIG.Token.hudClass {
                /** @type {boolean} */
                #targetTrayActive = false;

                /** @override */
                bind(object) {
                    this.#targetTrayActive = false;

                    return super.bind(object);
                }

                /** @override */
                activateListeners(html) {
                    super.activateListeners(html);

                    const targetControl = html[0].querySelector(`.control-icon[data-action="target"]`);

                    targetControl.classList.toggle("active", this.#targetTrayActive);
                }

                /** @override */
                _onClickControl(event) {
                    const button = event.currentTarget;

                    if (button.dataset.action === "target") {
                        event.preventDefault();

                        const active = this.#targetTrayActive = !this.#targetTrayActive;

                        button.classList.toggle("active", active);
                        button.querySelector(`.manage-player-targets.player-list`).classList.toggle("active", active);

                        return;
                    }

                    super._onClickControl(event);
                }
            };
        } else {
            const targetTrayActive = Symbol("targetTrayActive");

            TokenHUD.prototype.bind = (wrapped => function (object) {
                this[targetTrayActive] = false;

                return wrapped.call(this, object);
            })(TokenHUD.prototype.bind);

            TokenHUD.prototype.activateListeners = (wrapped => function (html) {
                wrapped.call(this, html);

                const targetControl = html[0].querySelector(`.control-icon[data-action="target"]`);

                targetControl.classList.toggle("active", this[targetTrayActive]);
            })(TokenHUD.prototype.activateListeners);

            TokenHUD.prototype._onToggleTarget = function (event) {
                event.preventDefault();

                const button = event.currentTarget;
                const active = this[targetTrayActive] = !this[targetTrayActive];

                button.classList.toggle("active", active);
                button.querySelector(`.manage-player-targets.player-list`).classList.toggle("active", active);
            };
        }

        function onToggleTarget(event) {
            event.preventDefault();

            const token = this.object;
            const userId = event.currentTarget.dataset.userId;
            const targets = token.controlled ? token.layer.controlled : [token, ...token.layer.controlled];
            const targeted = event.currentTarget.classList.toggle("targeting");

            if (userId === game.user.id) {
                targets.forEach(t => t.setTarget(targeted, { releaseOthers: false, groupSelection: true }));
                game.user.broadcastActivity({ targets: game.user.targets.ids });
            } else {
                game.socket.emit("module.manage-player-targets", {
                    sceneId: canvas.scene.id,
                    tokenIds: targets.map(t => t.document.id),
                    targeted
                }, { recipients: [userId] });
            }
        };

        Hooks.on("renderTokenHUD", (hud, html) => {
            const users = game.users.filter(user => user.isSelf || user.active && user.viewedScene === canvas.scene?.id).map(user => ({
                id: user.id,
                name: user.name,
                color: foundry.utils.Color.from(user.color).css,
                border: foundry.utils.Color.from(user.border).css,
                targeting: user.targets.has(hud.object)
            })).sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

            const targetControl = html[0].querySelector(`.control-icon[data-action="target"]`);

            targetControl.insertAdjacentHTML("beforeend", `
                <div class="manage-player-targets player-list">
                    ${users.map(user => `
                    <div class="manage-player-targets player ${user.targeting ? "targeting" : ""} flexrow" data-user-id="${user.id}">
                        <span class="manage-player-targets player-pip" style="background: ${user.color}; border-color: ${user.border}"></span>
                        <span class="manage-player-targets player-name">${user.name}</span>
                    </div>`).join("")}
                </div>
            `);

            const playerList = targetControl.querySelector(`.manage-player-targets.player-list`);

            ["click", "contextmenu", "mouseenter", "mouseleave"].forEach(
                eventType => playerList.addEventListener(eventType, event => {
                    event.preventDefault();
                    event.stopPropagation();
                })
            );

            playerList.querySelectorAll(`.manage-player-targets.player`).forEach(
                element => element.addEventListener("click", onToggleTarget.bind(hud))
            );
        });
    }

    if (foundry.utils.isNewerVersion(game.version, 11)) {
        Hooks.once("setup", setup);
    } else {
        Hooks.once("setup", () => {
            if (!game.settings.get("core", "noCanvas")) {
                Hooks.once("canvasInit", setup);
            }
        });
    }
});
