/* ═══════════════════════════════════════════════════════════
   MASSAGE-PRAXIS URDORF · GEMEINSAMES SCRIPT
   Hier muss normalerweise nichts angepasst werden.
   ═══════════════════════════════════════════════════════════ */

/* Mobiles Vollbild-Menü öffnen und schliessen */
var schalter = document.querySelector('.nav-schalter');
var menue = document.getElementById('mobilmenu');

if (schalter && menue) {
  schalter.addEventListener('click', function () {
    var offen = schalter.getAttribute('aria-expanded') === 'true';
    schalter.setAttribute('aria-expanded', String(!offen));
    schalter.setAttribute('aria-label', offen ? 'Menü öffnen' : 'Menü schliessen');
    menue.classList.toggle('offen', !offen);
    document.body.classList.toggle('menu-offen', !offen);
  });

  /* Menü schliessen, sobald ein Link angeklickt wird */
  menue.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      schalter.setAttribute('aria-expanded', 'false');
      menue.classList.remove('offen');
      document.body.classList.remove('menu-offen');
    }
  });
}

/* Klick auf Logo / "Home" führt immer ganz nach oben – auch wenn man
   bereits auf dieser Seite ist (sonst stellt der Browser die alte
   Scroll-Position wieder her, z. B. direkt nach einem Sprachwechsel). */
(function () {
  var homeLinks = document.querySelectorAll('.marke, #mobilmenu ul a[href$="index.html"]');
  Array.prototype.forEach.call(homeLinks, function (a) {
    a.addEventListener('click', function (e) {
      var ziel;
      try { ziel = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
      if (ziel.pathname !== window.location.pathname) return; // andere Seite: normal laden
      e.preventDefault();
      if (window.history && history.replaceState) {
        history.replaceState(null, '', window.location.pathname);
      }
      // eventuell offenes Mobilmenü schliessen
      var mm = document.getElementById('mobilmenu');
      var sw = document.querySelector('.nav-schalter');
      if (mm) mm.classList.remove('offen');
      if (sw) sw.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-offen');
      window.scrollTo(0, 0);
    });
  });
})();

/* Kopfzeile passt ihre Textfarbe an den Abschnitt dahinter an:
   über grünen Abschnitten heller Text, sonst dunkler Text.
   Grüne Abschnitte sind .ueber-block und .aufruf. */
(function () {
  var kopf = document.querySelector('.kopf');
  var dunkleAbschnitte = document.querySelectorAll('.ueber-block, .aufruf, .preise');
  if (!kopf || !dunkleAbschnitte.length || !('IntersectionObserver' in window)) return;

  var hoehe = kopf.offsetHeight || 72;
  var aktive = new Set();

  function beobachtungslinie() {
    // schmale Zone auf Höhe der Kopfzeilen-Mitte
    var mitte = Math.round(hoehe / 2);
    return { rootMargin: '-' + mitte + 'px 0px -' + (window.innerHeight - mitte - 2) + 'px 0px', threshold: 0 };
  }

  var beob;
  function starten() {
    if (beob) beob.disconnect();
    aktive.clear();
    beob = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) aktive.add(e.target); else aktive.delete(e.target);
      });
      kopf.classList.toggle('auf-dunkel', aktive.size > 0);
    }, beobachtungslinie());
    dunkleAbschnitte.forEach(function (s) { beob.observe(s); });
  }
  starten();
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(starten, 200);
  });
})();

/* Beim Sprachwechsel (DE <-> EN) an der gleichen Stelle weiterlesen.
   Wir merken uns, welcher Abschnitt zuoberst steht, und springen auf der
   Zielseite zum gleichen Abschnitt (beide Sprachen haben denselben Aufbau). */
(function () {
  function abschnitte() {
    return document.querySelectorAll('main > section, .fuss');
  }

  // 1) aktuelle Position an den Sprachlink hängen
  var sprachlinks = document.querySelectorAll('.sprachwahl a, .sprachwahl-mobil a');
  Array.prototype.forEach.call(sprachlinks, function (a) {
    a.addEventListener('click', function () {
      var y = window.scrollY;
      var secs = abschnitte(), idx = 0;
      for (var i = 0; i < secs.length; i++) {
        var top = secs[i].getBoundingClientRect().top + window.scrollY;
        if (top <= y + 2) { idx = i; } else break;
      }
      // Versatz relativ zum gewählten Abschnitt – auch negativ (ganz oben),
      // damit die Zielseite exakt dieselbe Position einnimmt (kein Sprung).
      var basisTop = secs[idx] ? (secs[idx].getBoundingClientRect().top + window.scrollY) : 0;
      var off = Math.round(y - basisTop);
      var href = a.getAttribute('href');
      if (!href) return;
      var basis = href.split('?')[0].split('#')[0];
      a.setAttribute('href', basis + '?sec=' + idx + '&off=' + off);
    });
  });

  // 2) auf der Zielseite die Position wiederherstellen
  var params = new URLSearchParams(window.location.search);
  if (params.has('sec')) {
    var zielIdx = parseInt(params.get('sec'), 10) || 0;
    var zielOff = parseInt(params.get('off'), 10) || 0;
    var springen = function () {
      var secs = abschnitte();
      var el = secs[Math.min(zielIdx, secs.length - 1)];
      var top = el ? (el.getBoundingClientRect().top + window.scrollY) : 0;
      window.scrollTo(0, Math.max(0, top + zielOff));
    };
    var zeigen = function () {
      document.documentElement.classList.remove('sprach-warten');
    };
    springen();
    // Mehrmals nachziehen: Layout verschiebt sich noch, bis Schriften und
    // Bilder geladen sind. Erst danach die Seite wieder einblenden – so
    // sieht man kein Springen an den Seitenanfang und zurück.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { springen(); zeigen(); });
    }
    window.addEventListener('load', function () {
      springen();
      setTimeout(function () { springen(); zeigen(); }, 100);
      setTimeout(springen, 350);
      setTimeout(springen, 700);
    });
    // Sicherheitsnetz: Seite auf jeden Fall wieder einblenden
    setTimeout(zeigen, 900);
    if (window.history && history.replaceState) {
      history.replaceState(null, '', window.location.pathname);
    }
  }
})();

/* Elemente sanft einblenden, wenn sie ins Bild scrollen.
   Respektiert die Systemeinstellung "Bewegung reduzieren". */
var bewegungOk = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

if (bewegungOk && 'IntersectionObserver' in window) {
  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (eintrag) {
      if (eintrag.isIntersecting) {
        eintrag.target.classList.add('sichtbar');
        beobachter.unobserve(eintrag.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.einblenden').forEach(function (el) {
    beobachter.observe(el);
  });
} else {
  document.querySelectorAll('.einblenden').forEach(function (el) {
    el.classList.add('sichtbar');
  });
}

/* ═══════════════════════════════════════════════════════════
   INHALTE AUS DEM CMS (Decap) EINSPIELEN
   Liest die Daten-Dateien unter /content und setzt Telefon, E-Mail,
   Adresse, Öffnungszeiten, Preise und Bilder ein. Die HTML-Dateien
   enthalten weiterhin sinnvolle Standardwerte (gut für SEO); diese
   Werte hier überschreiben sie, sobald Claudia im CMS etwas ändert.
   ═══════════════════════════════════════════════════════════ */
(function () {
  function holen(name) {
    return fetch('/content/' + name + '.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function reinerText(el) { return el && !el.querySelector('*'); }

  Promise.all([holen('kontakt'), holen('zeiten'), holen('preise'), holen('bilder')])
    .then(function (d) {
      if (d[0]) kontakt(d[0]);
      if (d[1]) zeiten(d[1]);
      if (d[2]) preise(d[2]);
      if (d[3]) bilder(d[3]);
    });

  function kontakt(k) {
    // Telefon-Links (tel:) + Anzeigetext
    if (k.telefon_intl) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute('href', 'tel:' + k.telefon_intl.replace(/\s+/g, ''));
        if (k.telefon_anzeige && /\d/.test(a.textContent) && reinerText(a)) {
          a.textContent = k.telefon_anzeige;
        }
      });
    }
    // E-Mail-Links (mailto:) + Anzeigetext
    if (k.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
        var alt = a.getAttribute('href');
        var query = alt.indexOf('?') > -1 ? alt.slice(alt.indexOf('?')) : '';
        a.setAttribute('href', 'mailto:' + k.email + query);
        if (a.textContent.indexOf('@') > -1 && reinerText(a)) a.textContent = k.email;
      });
    }
    // WhatsApp-Links – nur die Nummer ersetzen, ?text= bleibt erhalten
    if (k.whatsapp_nummer) {
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + k.whatsapp_nummer));
      });
    }
    // Adresse (Text) – überall dort, wo data-cms="adresse" steht
    if (k.strasse || k.plz_ort) {
      var adr = [k.strasse || '', k.plz_ort || ''].filter(Boolean).join('<br>');
      document.querySelectorAll('[data-cms="adresse"]').forEach(function (el) { el.innerHTML = adr; });
      document.querySelectorAll('[data-cms="adresse-zeile"]').forEach(function (el) {
        el.textContent = [k.strasse || '', k.plz_ort || ''].filter(Boolean).join(', ');
      });
    }
    // Google-Maps-Links auf die Adresse aktualisieren
    if (k.strasse && k.plz_ort) {
      var q = encodeURIComponent(k.strasse + ', ' + k.plz_ort);
      document.querySelectorAll('a[href*="google.com/maps"]').forEach(function (a) {
        a.setAttribute('href', 'https://www.google.com/maps/search/?api=1&query=' + q);
      });
    }
  }

  function zeiten(z) {
    var liste = document.querySelector('[data-cms="zeiten"]');
    if (liste && z.zeiten && z.zeiten.length) {
      liste.innerHTML = '';
      z.zeiten.forEach(function (row) {
        var dt = document.createElement('dt'); dt.textContent = row.tag || '';
        var dd = document.createElement('dd'); dd.textContent = row.zeit || '';
        liste.appendChild(dt); liste.appendChild(dd);
      });
    }
    var hinweis = document.querySelector('[data-cms="zeiten-hinweis"]');
    if (hinweis) {
      if (z.hinweis) { hinweis.textContent = z.hinweis; hinweis.hidden = false; }
      else { hinweis.hidden = true; }
    }
  }

  function preise(p) {
    if (!p.tarife) return;
    p.tarife.forEach(function (t, i) {
      var num = document.querySelector('[data-cms-preis="' + i + '"]');
      if (num && t.preis) num.textContent = t.preis;
      var dauer = document.querySelector('[data-cms-dauer="' + i + '"]');
      if (dauer && t.dauer) dauer.textContent = t.dauer;
    });
  }

  function bilder(b) {
    if (b.portrait) document.querySelectorAll('[data-cms="portrait"]').forEach(function (img) { img.src = b.portrait; });
    if (b.raum) document.querySelectorAll('[data-cms="raum"]').forEach(function (img) { img.src = b.raum; });
  }
})();
