export async function loadFonts() {
    const fontFace = new FontFace('Montserrat', 'url(assets/FONTS/MONTSERRAT-REGULAR.TTF)');
    await fontFace.load();
    document.fonts.add(fontFace);
    console.log("Шрифт Montserrat завантажено");
}

export const titleTextStyle = new PIXI.TextStyle({
    fontFamily: "Montserrat",
    fontSize: 36,
    fill: "#ffffff",
    fontWeight: "bold",
    align: "center",
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 5,
    wordWrap: true,
    wordWrapWidth: 300
    
});