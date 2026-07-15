console.log("App cargada");
console.log(spirits);
const grid = document.getElementById("grid");
const counter = document.getElementById("counter");
const progressBar = document.getElementById("progress-bar");

// Cargar colección guardada
let collection = JSON.parse(localStorage.getItem("collection")) || {};

function render(searchText = "") {

    grid.innerHTML = "";

    let owned = 0;
    const total = spirits.length;

    spirits
    .filter(spirit =>
    spirit.name.toLowerCase().includes(searchText.toLowerCase())
    )
    .forEach(spirit => {

        const checked = collection[spirit.id] === true;

        if (checked) owned++;

        const card = document.createElement("div");
        card.className =
        "card " +
        spirit.rarity.toLowerCase();

        card.innerHTML = `
            <img src="${spirit.image}" alt="${spirit.name}">
            <h3>${spirit.name}</h3>
            <p>${spirit.rarity}</p>

            <label>
                <input
                    type="checkbox"
                    data-id="${spirit.id}"
                    ${checked ? "checked" : ""}
                >
                Tengo
            </label>
        `;

        grid.appendChild(card);
    });

    // Actualizar contador
    counter.textContent = `${owned} / ${total}`;

    // Actualizar barra
    const percent = total > 0 ? (owned / total) * 100 : 0;
    progressBar.style.width = percent + "%";

    // Eventos de los checkboxes
    document.querySelectorAll("#grid input[type='checkbox']").forEach(box => {

        box.addEventListener("change", function () {

            collection[this.dataset.id] = this.checked;

            localStorage.setItem(
                "collection",
                JSON.stringify(collection)
            );

            render();

            document
            .getElementById("search")
            .addEventListener("input", function () {

            render(this.value);

            });

        });

    });

}

render();