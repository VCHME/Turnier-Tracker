<?php
/*
Plugin Name: VCHME Tournament Tracker
Description: Turnier-Tracker mit Gruppenphase (Round-Robin), Courts und Demo-Füllung. Shortcode: [tournament_tracker id="beach2025"]
Version: 1.5.1
Author: VCHME
*/
if (!defined('ABSPATH')) exit;

class VCHME_TT_Plugin {
  public function __construct(){
    add_shortcode('tournament_tracker', array($this,'render'));
    add_shortcode('vchme_tournament_tracker', array($this,'render')); // Alias
    add_action('wp_enqueue_scripts', array($this,'enqueue'));
  }
  public function enqueue(){
    $ver = '1.5.1';
    wp_enqueue_style('vchme-tt-style', plugins_url('assets/style.v151.css', __FILE__), array(), $ver);
    wp_enqueue_script('vchme-tt-app', plugins_url('assets/app.v151.js', __FILE__), array(), $ver, true);
  }
  public function render($atts){
    $atts = shortcode_atts(array('id'=>'default'), $atts);
    ob_start(); ?>
<div id="vchme-tt-app" data-tid="<?php echo esc_attr($atts['id']); ?>">
  <div class="vchme-tt__card" id="tt-setup">
    <h2>Turnier-Setup</h2>
    <p>Teams eintragen (bis zu 16), Courts &amp; Gruppen wählen.</p>
    <div class="vchme-tt__grid-small">
      <label>Courts
        <select id="tt-courts" name="tt-courts">
          <option value="1">1</option>
          <option value="2" selected>2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      <label>Gruppen
        <select id="tt-groups" name="tt-groups">
          <option value="1">1</option>
          <option value="2" selected>2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
    </div>
    <div class="vchme-tt__teams" id="tt-teams">
      <?php for($i=1;$i<=16;$i++): ?>
        <input id="tt-team-<?php echo $i; ?>" name="tt-team-<?php echo $i; ?>" type="text" placeholder="Team <?php echo $i; ?>" value="" autocomplete="off"/>
      <?php endfor; ?>
    </div>
    <div class="vchme-tt__controls">
      <button class="vchme-tt__btn" id="tt-start" type="button">Turnier starten</button>
      <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-demo" type="button">Demo befüllen</button>
      <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-clear" type="button">Zurücksetzen</button>
    </div>
  </div>

  <div class="vchme-tt__card" id="tt-groups-card" style="display:none">
    <div class="vchme-tt__header">
      <h3>Gruppenphase</h3>
      <div>
        <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-show-setup" type="button">Teilnehmer einblenden</button>
      </div>
    </div>
    <div class="vchme-tt__tables-head">
      <h4>Tabellen</h4>
      <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-tables" type="button">Ausblenden</button>
    </div>
    <div id="tt-tables" class="vchme-tt__tables-grid"></div>
    <h4>Nächste Spiele</h4>
    <div class="vchme-tt__courts" id="tt-next-grid"></div>
  </div>
</div>
<?php
    return ob_get_clean();
  }
}
new VCHME_TT_Plugin();
