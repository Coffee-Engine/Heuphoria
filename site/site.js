{
    const colourList = document.getElementById("colourList");

    //Loop and display every color
    for (key in Object.getOwnPropertyDescriptors(color)) {
        let value = color[key];
        if (value instanceof color) {
            const colorName = document.createElement("p");

            //Don't make invisible colours
            colorName.className = "colorName";

            //Color depending on color
            if (key != "transparent") {
                colorName.style.background = value.hex;

                if (
                    value.lightest > 128
                ) colorName.style.color = "#000000";
                else colorName.style.color = "#ffffff";
            }

            colorName.innerText = key;

            colourList.appendChild(colorName);
        }
    }
}