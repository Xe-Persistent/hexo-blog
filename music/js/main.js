let volume = 0.8;
const params = new URLSearchParams(window.location.search);
const musicPlayer = {
    changeMusicBg: function (isChangeBg = true) {
        const musicBg = document.getElementById("music_bg");
        if (isChangeBg) {
            const musicCover = document.querySelector("#music-page .aplayer-pic");
            let img = new Image();
            img.src = extractValue(musicCover.style.backgroundImage);
            img.onload = function () {
                musicBg.style.backgroundImage = musicCover.style.backgroundImage;
            };
        } else {
            let timer = setInterval(() => {
                const musicCover = document.querySelector("#music-page .aplayer-pic");
                if (musicCover) {
                    clearInterval(timer);
                    document.querySelector('meting-js').aplayer.volume(0.8, true);
                    musicPlayer.addEventListenerChangeMusicBg();
                }
            }, 100)
        }
    },
    addEventListenerChangeMusicBg: function () {
        const musicPage = document.getElementById("music-page");
        musicPage.querySelector("meting-js").aplayer.on('loadeddata', function () {
            musicPlayer.changeMusicBg();
        });
    },
    getCustomPlayList: function () {
        const musicPage = document.getElementById("music-page");
        const playlistType = params.get("type") || "playlist";
        if (params.get("id") && params.get("server")) {
            let id = params.get("id");
            let server = params.get("server");
            musicPage.innerHTML = `<meting-js id="${id}"server="${server}"type="${playlistType}"mutex="true"preload="auto"order="random"></meting-js>`;
        } else {
            musicPage.innerHTML = `<meting-js id="${userId}"server="${userServer}"type="${userType}"mutex="true"preload="auto"order="random"></meting-js>`;
        }
        musicPlayer.changeMusicBg(false);
    }
};
musicPlayer.getCustomPlayList();
const vh = window.innerHeight;
document.documentElement.style.setProperty('--vh', `${vh}px`);
window.addEventListener('resize', () => {
        let vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
);

function extractValue(input) {
    let valueRegex = /\("(\S+)"\)/g;
    let match = valueRegex.exec(input);
    return match[1];
}

document.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
        event.preventDefault();
        document.querySelector('meting-js').aplayer.toggle();
    }
    if (event.code === "ArrowRight") {
        event.preventDefault();
        document.querySelector('meting-js').aplayer.skipForward();
    }
    if (event.code === "ArrowLeft") {
        event.preventDefault();
        document.querySelector('meting-js').aplayer.skipBack();
    }
    if (event.code === "ArrowUp") {
        if (volume <= 1) {
            volume += 0.1;
            document.querySelector('meting-js').aplayer.volume(volume, true);
        }
    }
    if (event.code === "ArrowDown") {
        if (volume >= 0) {
            volume += -0.1;
            document.querySelector('meting-js').aplayer.volume(volume, true);
        }
    }
});
