/*
 * Guillem Pejó 
 * guillempejo@gmail.com
 * Updated on 14/12/2020
 */

var socialtags = [{
    img: "img/github.svg",
    link: "https://github.com/guillempejo"
}, {
    img: "img/linkedin.svg",
    link: "https://www.linkedin.com/in/guillempejo/"
}, {
    img: "img/twitter.svg",
    link: "https://twitter.com/GuillemPejo"
}]

function loadSocialIcons() {
    var socialtext = ""
    for (x in socialtags) {
        var data = `<a class="center" href="` + socialtags[x].link + `"> <img class="center" style="padding: 5px!important;width: 40px;" src="` + socialtags[x].img + `"></a>`
        socialtext += data
    }
    document.getElementById("social-list").innerHTML = socialtext;
}

loadSocialIcons()

function toggleTheme() {
    var element = document.body;
    element.classList.toggle("light-mode");
    var check = window.localStorage.getItem('light-mode');
    if (check == "light") {
            window.localStorage.setItem('light-mode', 'light');
    } else {
            window.localStorage.clear();

    }

}

function checkDayNight() {
    var check = window.localStorage.getItem('light-mode');
    var element = document.body;
    if (check == "light") {
        element.classList.remove("light-mode");
    } else {
        element.classList.add("light-mode");

    }
}

checkDayNight()


