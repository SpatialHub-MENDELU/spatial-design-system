import "../primitives/ar-button.js";
import "../primitives/ar-dialog.js"
import "../components/position.js";

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-entity id="mouseRaycaster" raycaster="objects: .clickable"
          cursor="rayOrigin: mouse; fuse: false;">
</a-entity>
<a-ar-dialog
    id="dialogBox"
    position="0 2 -3"
    title="Dialog Title"
    buttons="accept,close,No,Yes"
    color="yellow"
    mode="dark"
    textcolor="white"
></a-ar-dialog>
<a-ar-button
    id="openDialogButton"
    position="0 1.6 -3"
    size="medium"
    content="Open dialog"
    uppercase=true
    rounded=true
    outlined=true
    billboard
></a-ar-button>
`;

app.appendChild(scene);

scene.addEventListener("loaded", () => {
    const button = document.getElementById("openDialogButton");
    const dialog = document.getElementById("dialogBox");

    button.addEventListener("click", () => {
        openDialog(dialog, button);
    });
});

function openDialog(dialog, button) {
    dialog.setAttribute("visible", true);
    dialog.setAttribute("scale", "0.1 0.1 0.1"); // Start small

    dialog.setAttribute("animation", {
        property: "scale",
        to: "1 1 1",
        dur: 200,
        easing: "easeOutQuad"
    });

    button.setAttribute("visible", false);
    button.classList.remove("clickable");

    // Attach event to re-enable button
    dialog.addEventListener("dialogClosed", () => {
        enableButton(button);
    }); 
}

function enableButton(button) {
    setTimeout(() => {
    // Show the button again and re-enable interaction
    button.setAttribute("visible", true);
    button.classList.add("clickable");
    }, 100);
}
