<?php
/**
 * Plugin Name: Turnier-Tracker
 * Description: Plugin zur Anzeige und Verwaltung von Volleyballturnieren
 * Version: 1.3.3
 * Author: Manfred Richter
 */
if (!defined('ABSPATH')) { exit; }

class VCHME_TT_Full {
  public function __construct(){ add_shortcode('tournament_tracker', array($this,'render')); }
  private function enqueue_assets(){
    $css = @file_get_contents(plugin_dir_path(__FILE__).'assets/style.v133.css');
    if($css){
      wp_register_style('vchme-tt-style-v133', false);
      wp_enqueue_style('vchme-tt-style-v133');
      wp_add_inline_style('vchme-tt-style-v133', $css);
    }
    wp_enqueue_script('vchme-tt-app-v133', plugin_dir_url(__FILE__).'assets/app.v133.js', array(), '1.3.3', true);
  }
  public function render($atts){
    $this->enqueue_assets();
    ob_start(); ?>
    <div id="vchme-tt-app" class="vchme-tt">
      <div class="vchme-tt__card" id="tt-setup" style="display:block">
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
            <input id="tt-team-<?php echo $i; ?>" name="tt-team-<?php echo $i; ?>" type="text" placeholder="Team <?php echo $i; ?>" value="" />
          <?php endfor; ?>
        </div>
        <div class="vchme-tt__controls">
          <button class="vchme-tt__btn" id="tt-start" type="button">Turnier starten</button>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-apply-names" type="button">Namen übernehmen</button>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-demo" type="button">Demo füllen</button>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-clear" type="button">Zurücksetzen</button>
        </div>
      </div>

      <div id="tt-groups-ko" style="display:none">
        <div class="vchme-tt__card">
          <div class="vchme-tt__header">
            <h3>Gruppenphase</h3>
            <div class="vchme-tt__mode">
              <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-setup" type="button">Teilnehmer einblenden</button>
              <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-fill-scores" type="button">Test‑Ergebnisse (1–21)</button>
              <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-build-ko" type="button">KO erstellen</button>
            </div>
          </div>

          <div class="vchme-tt__grid-small">
            <strong>Courts:</strong> <span id="tt-courts-info">2</span>
          </div>

          <h4>Abgeschlossene Partien <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-done" type="button">Ausblenden</button></h4>
          <div class="vchme-tt__courts" id="tt-done-grid"></div>

          <h4>Nächste Spiele</h4>
          <div class="vchme-tt__courts" id="tt-next-grid"></div>

          <h4>Tabellen</h4>
          <div id="tt-tables"></div>
        </div>

        <div class="vchme-tt__card" id="tt-ko-card" style="display:none">
          <div class="vchme-tt__header">
            <h3>KO‑Phase</h3>
            <div class="vchme-tt__mode">
              <label>Aufsteiger je Gruppe
                <select id="tt-adv" name="tt-adv">
                  <option value="1">1</option>
                  <option value="2" selected>2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
              <label><input type="checkbox" id="tt-allplaces" name="tt-allplaces"> Alle Plätze ausspielen</label>
            </div>
          </div>

          <h4>Abgeschlossene Partien <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-ko-done" type="button">Ausblenden</button></h4>
          <div class="vchme-tt__courts" id="tt-ko-done-grid"></div>

          <h4>Nächste Spiele</h4>
          <div class="vchme-tt__courts" id="tt-ko-next-grid"></div>
        </div>
      </div>

      <div class="vchme-tt__card" id="tt-ranking" style="display:none">
        <h3>Rangliste</h3>
        <div id="tt-rank-body"></div>
      </div>
    </div>
    <?php
    return ob_get_clean();
  }
}
new VCHME_TT_Full();
