<?php
/**
 * Plugin Name: Turnier-Tracker
 * Description: Plugin zur rundenbasierten Verteilung von Volleyballspielen auf 2 Courts.
 * Version: 1.3.5
 * Author: VCHME
 */

if (!defined('ABSPATH')) exit;

class VCHME_TT_Scheduler {
    public function __construct() {
        add_shortcode('tournament_tracker', array($this, 'render'));
    }

    private function enqueue_assets() {
        wp_enqueue_style('vchme-tt-style', plugin_dir_url(__FILE__) . 'assets/style.v135.css');
        wp_enqueue_script('vchme-tt-app', plugin_dir_url(__FILE__) . 'assets/app.v135.js', array('jquery'), '1.3.5', true);
    }

    public function render($atts) {
        $this->enqueue_assets();
        ob_start(); ?>
        <div id="vchme-tt" class="tt-wrapper">
            <h2>Turnier-Tracker (1.3.5)</h2>
            <div id="setup" data-version="1.3.5">
                <!-- UI wird durch JavaScript generiert -->
            </div>
        <?php return ob_get_clean();
    }
}

new VCHME_TT_Scheduler();
?>
