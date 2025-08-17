<?php
/*
Plugin Name: VCHME Tournament Tracker
Description: Turnierverwaltung mit Gruppen- und KO-Phase, inkl. Courts und Ergebniserfassung.
Version: 1.5.4
Author: VCHME
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function vchme_tt_enqueue_assets() {
    wp_enqueue_style('vchme-tt-style', plugins_url('assets/style.v154.css', __FILE__));
    wp_enqueue_script('vchme-tt-app', plugins_url('assets/app.v154.js', __FILE__), array('jquery'), null, true);
}
add_action('wp_enqueue_scripts', 'vchme_tt_enqueue_assets');

function vchme_tt_shortcode($atts) {
    ob_start();
    include plugin_dir_path(__FILE__) . 'template.php';
    return ob_get_clean();
}
add_shortcode('tournament_tracker', 'vchme_tt_shortcode');
?>
