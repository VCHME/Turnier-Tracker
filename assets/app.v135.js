// app.v135.js – Spielverteilung rundenbasiert auf 2 Courts

document.addEventListener("DOMContentLoaded", function () {
    const setup = document.getElementById("setup");
    if (!setup) return;

    // Beispielteams (kann ersetzt werden durch Eingabe)
    const teams = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const matches = [];

    // Alle möglichen Paarungen (jeder gegen jeden)
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            matches.push({ team1: teams[i], team2: teams[j] });
        }
    }

    // Runde für Runde planen – einfache Verteilung auf 2 Courts
    const schedule = [];
    const played = {}; // team -> letzte Runde

    let round = 0;
    while (matches.length > 0) {
        const court1 = null;
        const court2 = null;
        const roundGames = [];
        const usedTeams = new Set();

        for (let c = 0; c < 2; c++) {
            for (let k = 0; k < matches.length; k++) {
                const match = matches[k];
                const t1 = match.team1, t2 = match.team2;

                const recentlyPlayed = team => played[team] !== undefined && round - played[team] < 2;
                if (!usedTeams.has(t1) && !usedTeams.has(t2) &&
                    !recentlyPlayed(t1) && !recentlyPlayed(t2)) {

                    usedTeams.add(t1);
                    usedTeams.add(t2);
                    roundGames.push({ court: c + 1, team1: t1, team2: t2 });
                    played[t1] = round;
                    played[t2] = round;
                    matches.splice(k, 1);
                    break;
                }
            }
        }

        if (roundGames.length === 0) break; // keine Spiele mehr möglich in dieser Runde
        schedule.push(roundGames);
        round++;
    }

    // Darstellung
    let html = "<h3>Spielplan</h3>";
    schedule.forEach((games, r) => {
        html += `<h4>Runde ${r + 1}</h4><ul>`;
        games.forEach(game => {
            html += `<li>Court ${game.court}: ${game.team1} vs ${game.team2}</li>`;
        });
        html += "</ul>";
    });

    setup.innerHTML = html;
});
