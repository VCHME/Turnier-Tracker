<?php
/**
 * Plugin Name: VCHME Tournament Tracker
 * Description: Gruppenphase + KO (Play-Ins, Bronze, optional Platzierung 5–8). Shortcode: [tournament_tracker]
 * Version: 1.1.9
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * Author: VCHME
 */
if ( ! defined('ABSPATH') ) { exit; }
if ( ! class_exists('VCHME_TT_FULL') ) {
  class VCHME_TT_FULL {
    public static function init(){ add_shortcode('tournament_tracker',[__CLASS__,'sc']); add_action('wp_enqueue_scripts',[__CLASS__,'assets']); }
    public static function assets(){
      $url = plugin_dir_url(__FILE__).'assets/'; $ver = '1755077514';
      wp_enqueue_style('vchme-tt', $url.'style.css', [], $ver);
      wp_enqueue_script('vchme-tt', $url.'app.v119.js', [], $ver, true);
    }
    public static function sc($a){
      ob_start(); ?>
<div id="vchme-tt-app" data-courts="2" data-groups="4">
  <div class="vchme-tt">
    <div class="vchme-tt__card" id="tt-setup">
      <h2>Turnier-Setup</h2>
      <p>Teams eintragen (bis zu 16), Courts & Gruppen wählen.</p>
      <div class="vchme-tt__teams" id="tt-teams"></div>
      <div class="vchme-tt__controls">
        <label>Courts
          <select id="tt-courts">
            <option>1</option><option selected>2</option><option>3</option><option>4</option>
          </select>
        </label>
        <label>Gruppen
          <select id="tt-groups">
            <option>1</option><option>2</option><option>3</option><option selected>4</option>
          </select>
        </label>
        <button class="vchme-tt__btn" id="tt-start">Turnier starten</button>
        <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-apply-names">Namen übernehmen</button>
        <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-demo">Demo füllen</button>
      </div>
    </div>

    <div id="tt-groups-ko" style="display:none">
      <div class="vchme-tt__card" id="tt-groups-card">
        <div class="vchme-tt__controls">
          <strong>Gruppenphase</strong>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-setup" style="margin-left:auto">Teilnehmer einblenden</button>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-fill-scores">Test-Ergebnisse (1–21)</button>
        </div>

        <div class="section-title">
          <h3>Abgeschlossene Partien</h3>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-done">Ausblenden</button>
        </div>
        <div class="vchme-tt__grid-courts" id="tt-done-grid"></div>

        <div class="section-title">
          <h3>Tabellen</h3>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-tables">Tabellen ausblenden</button>
        </div>
        <div class="vchme-tt__groups" id="tt-tables"></div>

        <div class="section-title"><h3>Nächste Spiele</h3><span class="vchme-tt__note">Courts: <span id="tt-courts-info"></span></span></div>
        <div class="vchme-tt__grid-courts" id="tt-next-grid"></div>

        <div class="vchme-tt__controls" id="tt-ko-setup" style="margin-top:12px">
          <strong>KO-Phase vorbereiten</strong>
          <label style="margin-left:12px">Aufsteiger je Gruppe
            <select id="tt-advance">
              <option>1</option><option selected>2</option><option>3</option><option>4</option>
            </select>
          </label>
          <label><input type="checkbox" id="tt-all-places"> Alle Plätze ausspielen</label>
          <button class="vchme-tt__btn" id="tt-build-ko">KO erstellen</button>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-rebuild-ko">KO neu erstellen</button>
        </div>
      </div>

      <div class="vchme-tt__card" id="tt-ko-card" style="display:none">
        <div class="vchme-tt__controls">
          <strong>KO-Phase</strong>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-groups2" style="margin-left:auto">Gruppenphase ausblenden</button>
        </div>

        <div class="section-title">
          <h3>Abgeschlossene Partien</h3>
          <button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-toggle-ko-done">Ausblenden</button>
        </div>
        <div class="vchme-tt__grid-courts" id="tt-ko-done-grid"></div>

        <div class="section-title"><h3>Nächste Spiele</h3><span class="vchme-tt__note">Courts: <span id="tt-ko-courts-info"></span></span></div>
        <div class="vchme-tt__grid-courts" id="tt-ko-next-grid"></div>

        <div class="vchme-tt__card" id="tt-ranking" style="margin-top:12px">
          <h3>Rangliste</h3>
          <div id="tt-ranking-body"></div>
        </div>
      </div>
    </div>

    <div class="vchme-tt__controls" style="margin-top:16px"><button class="vchme-tt__btn vchme-tt__btn--ghost" id="tt-clear">Zurücksetzen</button></div>
  </div>
</div>
<?php return ob_get_clean();
    }
  }
  VCHME_TT_FULL::init();
}
