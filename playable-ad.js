import { titleTextStyle,  loadFonts } from './style.js';

const LINK_TO_PLAYMARKET = "https://play.google.com/store/apps/details?id=games.burny.playdoku.block.puzzle&hl=en&gl=US";
class PlayableAd {
    constructor() {
        this.init();
        window.addEventListener("resize", () => {
            this.onResize();
        });
    }

   async init() {
        this.app = new PIXI.Application({
            width: 475,
            height: 771,
            backgroundColor: 0xffffff
        });
        globalThis.__PIXI_APP__ = this.app;
        document.body.appendChild(this.app.view);

        this.targetPositions = [
            { x: 300, y: 200 }, { x: 400, y: 200 }, { x: 500, y: 200 },
            { x: 300, y: 300 }, { x: 400, y: 300 }, { x: 500, y: 300 }
        ];

        this.figures = [];
        this.correctPlacements = 0;

        await this.loadAssets();
        this.loadSounds();
        this.setup();
        this.createTitle();
        this.createButton();
        
    }

    async  loadAssets() {       
        this.atlas = await PIXI.Assets.load('assets/image/image.json');
    }

    loadSounds() {
        this.sounds = {
            "well-done": new Audio("assets/sound/well-done.wav"),
            "place-figure": new Audio("assets/sound/place-figure.wav"),
            "final-screen": new Audio("assets/sound/final-screen.wav"),
            "back-music": new Audio("assets/sound/back-music.wav")
        };
        
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.5;
        });

        document.addEventListener("pointerdown", this.startBackgroundMusic.bind(this), { once: true });
    }

    startBackgroundMusic() {
        this.sounds["back-music"].loop = true;
        this.sounds["back-music"].play().catch(e => console.warn("Автовідтворення заблоковано браузером", e));
    }

    playSound(soundKey) {
        if (this.sounds[soundKey]) {
            this.sounds[soundKey].currentTime = 0;
            this.sounds[soundKey].play();
        }
    }

    setup() {
        this.background = new PIXI.Sprite(PIXI.Texture.from('assets/image/BG.png'));
        this.app.stage.addChild(this.background);
        
        const atlas = this.atlas.textures;
        
        this.cupcake = new PIXI.Sprite(atlas["cupcake.png"]);
        this.redFill = new PIXI.Sprite(atlas["red_fill.png"]);

        this.redFill.x = this.app.renderer.width / 2;
        this.redFill.y = this.app.renderer.height / 2;
        this.redFill.anchor.set(0.5, 0.6);
        this.redFill.scale.set(0.4);

        this.cupcake.x = this.app.renderer.width / 2;
        this.cupcake.y = this.app.renderer.height / 2;
        this.cupcake.anchor.set(0.5);
        this.cupcake.scale.set(0.4);

        this.app.stage.addChild(this.redFill);
        this.redFill.visible = false;
        this.app.stage.addChild(this.cupcake);
        
        const positions = [
            { x: 100, y: 450 }, { x: 200, y: 450 }, { x: 300, y: 450 },
            { x: 400, y: 450 }, { x: 500, y: 450 }, { x: 600, y: 450 }
        ];
        
        for (let i = 1; i <= 6; i++) {
            let figure = new PIXI.Sprite(atlas[`figure_${i}.png`]);
            figure.x = positions[i - 1].x;
            figure.y = positions[i - 1].y;
            figure.interactive = true;
            figure.buttonMode = true;
            figure.anchor.set(0.5);
            figure.scale.set(0.4);
            figure.on('pointerdown', this.onDragStart.bind(this));
            figure.on('pointermove', this.onDragMove.bind(this));
            figure.on('pointerup', this.onDragEnd.bind(this));
            figure.on('pointerupoutside', this.onDragEnd.bind(this));
            this.app.stage.addChild(figure);
            this.figures.push(figure);
        }

        this.createCustomCursor();
    }
    
    createTitle() {
        const text = "Fill up the cupcake for IQ 120+";       

        let title = new PIXI.Text(text, titleTextStyle);
        title.x = this.app.renderer.width / 2;
        title.y = 50;
        title.anchor.set(0.5);
        this.app.stage.addChild(title);
    }

    createCustomCursor() {
        const handTexture = PIXI.Texture.from('assets/image/Hand.png');
        this.cursorSprite = new PIXI.Sprite(handTexture);
        this.cursorSprite.anchor.set(0.5);
        this.cursorSprite.scale.set(0.5);
        this.cursorSprite.visible = false;
        this.app.stage.addChild(this.cursorSprite);

        this.app.view.style.cursor = "none";

        this.app.view.addEventListener("mousemove", (event) => {
            this.cursorSprite.x = event.clientX - this.app.view.getBoundingClientRect().left;
            this.cursorSprite.y = event.clientY - this.app.view.getBoundingClientRect().top;
            this.cursorSprite.visible = true;
            this.app.stage.setChildIndex(this.cursorSprite, this.app.stage.children.length - 1);
        });

        this.app.view.addEventListener("mouseleave", () => {
            this.cursorSprite.visible = false;
        });
    }

    onDragStart(event) {
        this.data = event.data;
        this.dragging = true;
        this.draggedFigure = event.currentTarget;
        this.app.stage.addChild(this.draggedFigure); 
    }

    onDragMove(event) {
        if (this.dragging) {
            let newPosition = this.data.getLocalPosition(this.app.stage);
            event.currentTarget.x = newPosition.x;
            event.currentTarget.y = newPosition.y;
        }
    }    

    onDragEnd(event) {
        this.dragging = false;
        this.data = null;
        let figure = event.currentTarget;
        this.playSound("place-figure");    
       
        let figureX = figure.x;
        let figureY = figure.y;
    
        let insideCupcake = this.cupcake.getBounds().contains(figureX, figureY);
        if (!insideCupcake) {
            this.showTryAgain();
            this.resetGame();
            return;
        }

        let correctPosition = this.findCorrectPosition(figure, figureX, figureY);
        if (!correctPosition) {
            this.showTryAgain();
            this.resetGame();
            return;
        }
    
        if (this.isPositionOccupied(correctPosition)) {
            this.showTryAgain();
            this.resetGame();
            return;
        }

        gsap.to(figure, { x: correctPosition.x, y: correctPosition.y, duration: 0.3 });    
        
        this.updateGameState(figure, correctPosition);
    
        if (this.isGameComplete()) {
            this.playSound("well-done");
            this.showFinalScreen();
        }
    }

    checkPlacementCorrect() {
        return this.figures.every(figure => this.cupcake.getBounds().contains(figure.x, figure.y));
    }

    showTryAgain() {
        this.redFill.visible = true;
        gsap.to(this.redFill, { alpha: 0, duration: 1, onComplete: () => { this.redFill.visible = false; } });
    }

    resetGame() {
        const positions = [
            { x: 100, y: 450 }, { x: 200, y: 450 }, { x: 300, y: 450 },
            { x: 400, y: 450 }, { x: 500, y: 450 }, { x: 600, y: 450 }
        ];
    
        this.figures.forEach((figure, index) => {
            gsap.to(figure, { x: positions[index].x, y: positions[index].y, duration: 0.3 });
        });
    }

    findCorrectPosition(figure, x, y) {
        let figureIndex = this.figures.indexOf(figure);
    
        for (let i = 0; i < this.targetPositions.length; i++) {
            let targetX = this.targetPositions[i].x;
            let targetY = this.targetPositions[i].y;
               
            if (
                x >= targetX - figure.width / 2 &&
                x <= targetX + figure.width / 2 &&
                y >= targetY - figure.height / 2 &&
                y <= targetY + figure.height / 2
            ) {                    
                return { x: targetX, y: targetY };
            }
        }
    
        return null;
    }

    isPositionOccupied(position) {
        for (let i = 0; i < this.figures.length; i++) {
            let figure = this.figures[i];

            if (
                figure.x === position.x &&
                figure.y === position.y
            ) {
                return true;
            }
        }
    
        return false;
    }

    updateGameState(figure, position) {
        let figureIndex = this.figures.indexOf(figure);
    
        this.figures[figureIndex].x = position.x;
        this.figures[figureIndex].y = position.y;
    }

    isGameComplete() {
        for (let i = 0; i < this.figures.length; i++) {
            let figure = this.figures[i];
            let correctPosition = this.targetPositions[i];
    
            if (
                figure.x !== correctPosition.x ||
                figure.y !== correctPosition.y
            ) {
                return false;
            }
        }
    
        return true;
    }

    showFinalScreen() {
        const atlas = this.atlas.textures;
        let finalScreenKey = Object.keys(atlas).find(key => key.includes("plashka"));
        if (!finalScreenKey) {
            console.error("Фінальний екран не знайдено в атласі");
            return;
        }
        
        let finalScreen = new PIXI.Sprite(atlas[finalScreenKey]);
        finalScreen.x = this.app.renderer.width / 2;
        finalScreen.y = this.app.renderer.height / 2;
        finalScreen.anchor.set(0.5);
        this.button.classList.remove("hidden");        
        this.app.stage.addChild(finalScreen);      
        this.playSound("final-screen");  
        
    }

    createButton() {
        this.button = document.createElement("button");
        this.button.innerText = "Play Now";
        this.button.classList.add("play-button");
        this.button.onclick = () => {
            window.location.href = LINK_TO_PLAYMARKET;
        };
        document.body.appendChild(this.button);   
        this.button.classList.add("hidden");   

    }

    onResize() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        
        let scaleFactor = Math.min(window.innerWidth / 800, window.innerHeight / 600); 

    
        this.cupcake.x = this.app.renderer.width / 2;
        this.cupcake.y = this.app.renderer.height / 2;
        this.cupcake.scale.set(scaleFactor * 0.4);

        this.redFill.x = this.app.renderer.width / 2;
        this.redFill.y = this.app.renderer.height / 2;
        this.redFill.scale.set(scaleFactor * 0.4);

        const startX = this.app.renderer.width * 0.1;
        const startY = this.app.renderer.height * 0.75;
        const spacing = this.app.renderer.width * 0.12;

        this.figures.forEach((figure, index) => {
            figure.x = startX + index * spacing;
            figure.y = startY;
            figure.scale.set(scaleFactor * 0.4);
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let playableAd = new PlayableAd();
});
