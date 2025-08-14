<?php
/**
 * Plugin Name: Turnier-Tracker
 * Description: Plugin zur Anzeige und fairen Verteilung von Volleyballspielen auf 2 Courts.
 * Version: 1.3.4
 * Author: VCHME
 */

if (!defined('ABSPATH')) exit;

class VCHME_TT_Fair {
    public function __construct() {
        add_shortcode('tournament_tracker', array($this, 'render'));
    }

    private function enqueue_assets() {
        wp_enqueue_style('vchme-tt-style', plugin_dir_url(__FILE__) . 'assets/style.v134.css');
        wp_enqueue_script('vchme-tt-app', plugin_dir_url(__FILE__) . 'assets/app.v134.js', array('jquery'), '1.3.4', true);
    }

    public function render($atts) {
        $this->enqueue_assets();
        ob_start(); ?>
        <div id="vchme-tt" class="tt-wrapper">
            <h2>Turnier-Setup (Balanced)</h2>
            <p>Teams eintragen, Courts & Gruppen wählen – Spiele werden gleichmäßig auf Courts verteilt.</p>
            <div id="setup" data-version="1.3.4">
                <!-- Dieses HTML wird durch JavaScript ersetzt -->
            </div>
        <?php return ob_get_clean();
    }
}

new VCHME_TT_Fair();
?>
