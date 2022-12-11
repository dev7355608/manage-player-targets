const MODULE_ID = "manage-player-targets";

Hooks.once("ready", () => {
    if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
        return;
    }

    const TARGET_CONTROL_ACTIVE = Symbol(MODULE_ID);

    function TokenHUD_bind(wrapped, ...args) {
        this[TARGET_CONTROL_ACTIVE] = false;

        return wrapped(...args);
    }

    function TokenHUD_onToggleTarget(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const active = this[TARGET_CONTROL_ACTIVE] = !this[TARGET_CONTROL_ACTIVE];

        button.classList.toggle("active", active);
        button.querySelector(`.${MODULE_ID}.player-list`).classList.toggle("active", active);
    }

    if (game.modules.get("lib-wrapper")?.active) {
        libWrapper.register(
            MODULE_ID,
            "TokenHUD.prototype.bind",
            TokenHUD_bind,
            libWrapper.WRAPPER
        );

        libWrapper.register(
            MODULE_ID,
            "TokenHUD.prototype._onToggleTarget",
            TokenHUD_onToggleTarget,
            libWrapper.OVERRIDE
        );
    } else {
        TokenHUD.prototype.bind = (original => function (...args) {
            return TokenHUD_bind.call(this, original.bind(this), ...args);
        })(TokenHUD.prototype.bind);

        TokenHUD.prototype._onToggleTarget = TokenHUD_onToggleTarget;
    }

    function onToggleTarget(event) {
        event.preventDefault();

        const token = this.object;
        const targeted = event.currentTarget.classList.toggle("targeting");
        const user = game.users.get(event.currentTarget.dataset.userId);

        token.setTarget(targeted, { user, releaseOthers: false });
    };

    Hooks.on("renderTokenHUD", (hud, html) => {
        const users = game.users.filter(user => user.active).map(user => ({
            id: user.id,
            name: user.name,
            color: foundry.utils.Color.from(user.color).css,
            border: foundry.utils.Color.from(user.border).css,
            targeting: user.targets.has(hud.object)
        })).sort((a, b) => a.name.localeCompare(b.name));

        const targetControl = html[0].querySelector(`.control-icon[data-action="target"]`);

        targetControl.classList.toggle("active", hud[TARGET_CONTROL_ACTIVE]);
        targetControl.insertAdjacentHTML("beforeend", `
            <div class="${MODULE_ID} player-list ${hud[TARGET_CONTROL_ACTIVE] ? "active" : ""}">
                ${users.map(user => `
                <div class="${MODULE_ID} player ${user.targeting ? "targeting" : ""} flexrow" data-user-id="${user.id}">
                    <span class="${MODULE_ID} player-pip" style="background: ${user.color}; border-color: ${user.border}"></span>
                    <span class="${MODULE_ID} player-name">${user.name}</span>
                </div>`).join("")}
            </div>
        `);

        const playerList = targetControl.querySelector(`.${MODULE_ID}.player-list`);

        ["click", "contextmenu", "mouseenter", "mouseleave"].forEach(
            eventType => playerList.addEventListener(eventType, event => {
                event.preventDefault();
                event.stopPropagation();
            })
        );

        playerList.querySelectorAll(`.${MODULE_ID}.player`).forEach(
            element => element.addEventListener("click", onToggleTarget.bind(hud))
        );
    });
});
