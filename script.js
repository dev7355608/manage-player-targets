Hooks.once("ready", () => {
    if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
        return;
    }

    const TARGET_CONTROL_ACTIVE = Symbol();

    TokenHUD.prototype.bind = (original => function () {
        this[TARGET_CONTROL_ACTIVE] = false;

        return original.apply(this, arguments);
    })(TokenHUD.prototype.bind);

    TokenHUD.prototype._onToggleTarget = function (event) {
        event.preventDefault();

        const button = event.currentTarget;
        const active = this[TARGET_CONTROL_ACTIVE] = !this[TARGET_CONTROL_ACTIVE];

        button.classList.toggle("active", active);
        button.querySelector(`.manage-player-targets.player-list`).classList.toggle("active", active);
    };

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
            <div class="manage-player-targets player-list ${hud[TARGET_CONTROL_ACTIVE] ? "active" : ""}">
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
});
