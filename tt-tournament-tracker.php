<?php
/**
 * Plugin Name: TT Tournament Tracker
 * Description: React-basierter Turnier-Tracker mit Gruppen- und KO-Phase. Shortcode: [tournament_tracker]
 * Version: 1.0.3
 * Author: ChatGPT
 */

if (!defined('ABSPATH')) { exit; }

function tt_tournament_tracker_shortcode() {
    $app_url = plugins_url('assets/app.jsx', __FILE__);
    ob_start();
    ?>
    <div class="tt-tracker-wrapper">
      <div class="tt-tracker-root"></div>
    </div>
    <!-- Tailwind (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React 18 UMD -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <!-- Babel Standalone for in-browser transform of JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- App JSX -->
    <script type="text/babel" data-presets="react" src="<?php echo esc_url($app_url); ?>"></script>
    <?php
    return ob_get_clean();
}
add_shortcode('tournament_tracker', 'tt_tournament_tracker_shortcode');
