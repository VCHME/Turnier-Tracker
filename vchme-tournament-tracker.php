<?php
/*
Plugin Name: VCHME Tournament Tracker
Description: Plugin zur Verwaltung von Turnieren mit Gruppen- und KO-Phase.
Version: 1.4.3
Author: VCHME
*/

if (!defined('ABSPATH')) exit;

// Enqueue Scripts & Styles
function vchme_tt_enqueue_assets() {
    wp_enqueue_style('vchme-tt-style', plugins_url('assets/style.v143.css', __FILE__));
    wp_enqueue_script('vchme-tt-app', plugins_url('assets/app.v143.js', __FILE__), array('jquery'), false, true);
}
add_action('wp_enqueue_scripts', 'vchme_tt_enqueue_assets');

// Shortcode
function vchme_tt_shortcode() {
    ob_start(); ?>
    <div id="vchme-tt-app"></div>
    <?php return ob_get_clean();
}
add_shortcode('vchme_tournament_tracker', 'vchme_tt_shortcode');
