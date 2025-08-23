jQuery(document).ready(function($) {
    console.log("Tournament Tracker 1.5.4 loaded");

    $("#tt-start").on("click", function() {
        alert("Turnier gestartet!");
    });

    $("#tt-demo").on("click", function() {
        alert("Demo befüllt!");
    });

    $("#tt-reset").on("click", function() {
        alert("Zurückgesetzt!");
    });
});
