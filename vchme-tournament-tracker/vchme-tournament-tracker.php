<?php
/*
Plugin Name: VCHME Tournament Tracker
Description: Turnierverwaltung mit Gruppen, Courts und Live-Tabellen.
Version: 1.5.2
Author: VCHME
*/

function vchme_tt_enqueue_scripts() {
    $plugin_url = plugin_dir_url(__FILE__);
    wp_enqueue_style('vchme-tt-style', $plugin_url . 'assets/style.v152.css');
    wp_enqueue_script('vchme-tt-app', $plugin_url . 'assets/app.v152.js', array(), false, true);
}
add_action('wp_enqueue_scripts', 'vchme_tt_enqueue_scripts');

function vchme_tt_shortcode($atts) {
    ob_start(); ?>
    <div class="vchme-tt">
      <div id="tt-setup">
        <h3>Turnier Setup</h3>
        <label>Courts: <input id="tt-courts" type="number" value="2" min="1" max="4"></label>
        <label>Gruppen: <input id="tt-groups" type="number" value="2" min="1" max="4"></label>
        <div id="tt-teams">
          <?php for($i=1;$i<=16;$i++): ?>
            <input type="text" placeholder="Team <?php echo $i; ?>">
          <?php endfor; ?>
        </div>
        <button id="tt-start">Turnier starten</button>
        <button id="tt-demo">Demo befüllen</button>
        <button id="tt-clear">Zurücksetzen</button>
      </div>
      <div id="tt-groups-card" style="display:none;">
        <h3>Gruppen & Tabellen <button id="tt-toggle-tables">Ausblenden</button></h3>
        <div id="tt-tables" class="cols-2"></div>
        <h3>Nächste Spiele</h3>
        <div id="tt-next-grid" class="vchme-tt__grid"></div>
        <button id="tt-show-setup">Setup anzeigen</button>
      </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('tournament_tracker', 'vchme_tt_shortcode');
?>
