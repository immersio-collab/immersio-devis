const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOuKGClWbLeXICNmSVpoOn6MuZOCD4Peg3gixT45LV7yU6nny-_pVkbjS5ZyxtZU5A/exec";

// ── GLOBAL UTILS ────────────────────────────────────────────────────────────

// Strip badge text (e.g. "× 1.35") by reading only text nodes from .check-label
function labelText(el) {
  return [...el.querySelector('.check-label').childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .join(' ').trim();
}

// ── INTERACTION ─────────────────────────────────────────────────────────────

const manualOverrides = new Set();
function setManual(id) { manualOverrides.add(id); }

function resetRemiseOverride(e) {
  if (e) e.preventDefault();
  manualOverrides.delete('remise');
  updateAutoPrices();
  updateTotal();
}

let lastTypeCoef = 1.0;
let lastSuperfCoef = 1.0;

function resetCalculations() {
  manualOverrides.clear();
  updateAutoPrices();
  updateTotal();
}

function toggleCheck(el) {
  el.classList.toggle('checked');
  const chk = el.querySelector('input[type="checkbox"]');
  if (chk) chk.checked = el.classList.contains('checked');
}

function toggleRadio(el, group) {
  document.querySelectorAll(`#${group}Grid .check-item`).forEach(i => {
    i.classList.remove('checked');
    const rad = i.querySelector('input[type="radio"]');
    if (rad) rad.checked = false;
  });
  el.classList.add('checked');
  const rad = el.querySelector('input[type="radio"]');
  if (rad) rad.checked = true;

  if (group === 'type' || group === 'superf') {
    const val = rad ? rad.value : '';
    const priceTour3DInput = document.getElementById('price_tour3d');
    let currentTour3D = parseFloat(priceTour3DInput.value) || 0;

    if (currentTour3D > 0) {
      if (group === 'type') {
        const newCoef = TYPE_COEFS[val] || 1.0;
        currentTour3D = (currentTour3D / lastTypeCoef) * newCoef;
        priceTour3DInput.value = Math.round(currentTour3D);
        lastTypeCoef = newCoef;
      } else if (group === 'superf') {
        const newCoef = SUPERF_COEFS[val] || 1.0;
        currentTour3D = (currentTour3D / lastSuperfCoef) * newCoef;
        priceTour3DInput.value = Math.round(currentTour3D);
        lastSuperfCoef = newCoef;
      }
    } else {
      if (group === 'type') {
        lastTypeCoef = TYPE_COEFS[val] || 1.0;
      } else if (group === 'superf') {
        lastSuperfCoef = SUPERF_COEFS[val] || 1.0;
      }
    }
  }

  updateAutoPrices();
  updateTotal();
}

function toggleOption(row) {
  row.classList.toggle('selected');
  updateAutoPrices();
  updateTotal();
}

function selectHeberg(item) {
  document.querySelectorAll('#hebergGrid .heberg-item').forEach(i => {
    i.classList.remove('selected');
    const rad = i.querySelector('input[type="radio"]');
    if (rad) rad.checked = false;
  });
  item.classList.add('selected');
  const rad = item.querySelector('input[type="radio"]');
  if (rad) rad.checked = true;
  updateTotal();
}

// ── AUTO PRICING ENGINE ─────────────────────────────────────────────────────

const SUPERF_COEFS = {
  '<50': 1.0, '50-100': 1.3, '100-200': 1.6, 
  '200-500': 2.0, '500-1000': 2.6, '>1000': 3.5
};
const TYPE_COEFS = {
  'appartement': 1.0, 'residence': 1.0, 'villa': 1.15,
  'showroom': 1.20, 'salle_sport': 1.25, 'riad': 1.35,
  'evenementiel': 1.40, 'hotel': 1.45
};

function getCalculatedTour3D() {
  return parseFloat(document.getElementById('price_tour3d').value) || 0;
}

function updateAutoPrices() {
  let calculatedTour3D = getCalculatedTour3D();

  // If we don't have a base price yet, stop
  if (calculatedTour3D === 0) {
    document.getElementById('autoPriceBadge').style.display = 'none';
    return;
  }
  
  document.getElementById('autoPriceBadge').style.display = 'flex';

  // 2. Options Proportional Pricing
  if (!manualOverrides.has('price_plan2d')) document.getElementById('price_plan2d').value = Math.round(calculatedTour3D * 0.15);
  if (!manualOverrides.has('price_video')) document.getElementById('price_video').value = Math.round(calculatedTour3D * 0.25);
  if (!manualOverrides.has('price_photos')) document.getElementById('price_photos').value = Math.round(calculatedTour3D * 0.20);
  if (!manualOverrides.has('price_branding')) document.getElementById('price_branding').value = Math.max(200, Math.round(calculatedTour3D * 0.10));
  if (!manualOverrides.has('price_gmaps')) document.getElementById('price_gmaps').value = 150;

  // 3. Tags Tiered Pricing (Total Combined Price)
  if (!manualOverrides.has('price_tags')) {
    const qty = parseInt(document.getElementById('qty_tags').value) || 1;
    let tagsTotal = 0;
    if (qty <= 5) tagsTotal = qty * 80;
    else tagsTotal = (5 * 80) + ((qty - 5) * 50);
    document.getElementById('price_tags').value = tagsTotal;
  }

  // 4. Hébergement Pricing
  if (!manualOverrides.has('hprice_1')) document.getElementById('hprice_1').value = Math.max(150, Math.round(calculatedTour3D * 0.12));
  if (!manualOverrides.has('hprice_3')) document.getElementById('hprice_3').value = Math.max(200, Math.round(calculatedTour3D * 0.20));
  if (!manualOverrides.has('hprice_6')) document.getElementById('hprice_6').value = Math.max(250, Math.round(calculatedTour3D * 0.30));
  if (!manualOverrides.has('hprice_12')) document.getElementById('hprice_12').value = Math.max(350, Math.round(calculatedTour3D * 0.45));
  if (!manualOverrides.has('hprice_24')) document.getElementById('hprice_24').value = Math.max(500, Math.round(calculatedTour3D * 0.65));

  // 5. Bundle Discount logic
  const opts = ['plan2d', 'video', 'photos', 'branding', 'gmaps', 'tags'];
  let activeOpts = 0;
  opts.forEach(id => {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row && row.classList.contains('selected')) activeOpts++;
  });
  
  const remiseInput = document.getElementById('remise');
  let autoRemise = 0;
  if (activeOpts >= 3) autoRemise = 10;
  else if (activeOpts === 2) autoRemise = 5;

  const noteEl = document.getElementById('remiseAutoNote');
  const autoPctEl = document.getElementById('remiseAutoPct');

  if (manualOverrides.has('remise')) {
    const currentVal = parseFloat(remiseInput.value) || 0;
    if (currentVal !== autoRemise) {
      if (autoPctEl) autoPctEl.textContent = autoRemise;
      if (noteEl) noteEl.style.display = 'block';
    } else {
      if (noteEl) noteEl.style.display = 'none';
    }
  } else {
    remiseInput.value = autoRemise;
    if (noteEl) noteEl.style.display = 'none';
  }
}

// ── TOTALS ──────────────────────────────────────────────────────────────────

function getVal(id) { return parseFloat(document.getElementById(id).value) || 0; }

function updateTotal() {
  let sub = getCalculatedTour3D();

  const opts = ['plan2d', 'video', 'photos', 'branding', 'gmaps'];
  opts.forEach(id => {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row && row.classList.contains('selected')) sub += getVal('price_' + id);
  });

  // Tags: combined total price
  const tagsRow = document.querySelector('[data-id="tags"]');
  if (tagsRow && tagsRow.classList.contains('selected')) {
    sub += getVal('price_tags');
  }

  // Heberg
  const hebergSel = document.querySelector('#hebergGrid .heberg-item.selected');
  if (hebergSel) {
    const rad = hebergSel.querySelector('input[type="radio"]');
    const inp = document.getElementById('hprice_' + rad.value);
    if (inp) sub += parseFloat(inp.value) || 0;
  }

  const remisePct = getVal('remise');
  const remiseAmt = sub * remisePct / 100;
  const total = sub - remiseAmt;

  document.getElementById('display_subtotal').textContent = fmt(sub) + ' MAD';
  document.getElementById('display_remise').textContent = '— ' + fmt(remiseAmt) + ' MAD';
  document.getElementById('display_total').textContent = fmt(total) + ' MAD';
}

function fmt(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

// ── PDF GENERATION ───────────────────────────────────────────────────────────

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const ML = 15, MR = 15, MT = 15;
  const CW = W - ML - MR;
  let y = MT;

  // Premium Monochromatic Palette
  const BG = [248, 248, 250]; // Soft Card Background
  const DARK_C = [16, 16, 20]; // Premium Brand Charcoal
  const WHITE_C = [255, 255, 255];
  const MUTED_C = [138, 138, 154];
  const BORDER_C = [219, 218, 217]; // Website Soft Borders
  const BLUE_C = [16, 16, 20]; // Dark Highlights
  const BLUE_LT = [240, 241, 244]; // Subtle Selection Gray
  const SECT_BG = [238, 239, 242];

  function setColor(rgb, type = 'fill') {
    if (type === 'fill') doc.setFillColor(...rgb);
    else doc.setDrawColor(...rgb);
  }

  function roundedCard(x, cy, w, h, fill = BG, stroke = BORDER_C, radius = 3) {
    if (fill) { setColor(fill); doc.setFillColor(...fill); }
    if (stroke) { setColor(stroke, 'draw'); doc.setLineWidth(0.3); }
    doc.roundedRect(x, cy, w, h, radius, radius, fill && stroke ? 'FD' : fill ? 'F' : 'D');
  }

  function text(t, x, tx, opts = {}) {
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(...(opts.color || DARK_C));
    if (opts.bold) doc.setFont('helvetica', 'bold');
    else if (opts.italic) doc.setFont('helvetica', 'italic');
    else doc.setFont('helvetica', 'normal');
    const align = opts.align || 'left';
    doc.text(t, x, tx, { align });
  }

  function hline(ly, color = BORDER_C) {
    setColor(color, 'draw');
    doc.setLineWidth(0.2);
    doc.line(ML + 0.5, ly, W - MR - 0.5, ly);
  }

  // jsPDF-safe number formatter: fr-FR locale uses U+202F (narrow no-break space)
  // as thousands separator, which jsPDF misinterprets as character spacing → digits explode apart.
  // We replace it with a plain ASCII space before passing any string to doc.text().
  function pdfFmt(n) {
    return fmt(n).replace(/\u202f/g, ' ');
  }

  // ── 1. SOLID CHARCOAL HEADER BANNER (PREMIUM) ───────────────────────────
  roundedCard(ML, y, CW, 22, DARK_C, null, 4);
  
  // Left Details (White & Silver Muted Text)
  text('Immersio.', ML + 6, y + 8, { bold: true, size: 16, color: WHITE_C });
  text('Vos clients visitent en ligne. Ils réservent. Ils achètent.', ML + 6, y + 14, { size: 7.5, color: [197, 198, 206], italic: true });

  // Right Details
  const devisNum = document.getElementById('clientNom').value ? `N° DEV-${Date.now().toString().slice(-6)}` : 'N° DEVIS';
  const today = new Date().toLocaleDateString('fr-FR');
  const validite = document.getElementById('validite').value || '30';

  text('DEVIS COMMERCIAL', W - MR - 6, y + 7, { bold: true, size: 11, align: 'right', color: WHITE_C });
  text(devisNum, W - MR - 6, y + 11.5, { size: 8, bold: true, align: 'right', color: WHITE_C });
  text(`Date : ${today}  ·  Validité : ${validite} jours`, W - MR - 6, y + 15.5, { size: 7, color: [197, 198, 206], align: 'right' });
  
  y += 28; // Beautiful spacing gap below header

  // ── 2. SIDE-BY-SIDE METADATA CARDS (CLIENT & PROPERTY SPECS) ─────────────
  const cardW = (CW - 6) / 2; // 87mm width each
  
  // Fetch values and safe truncate to prevent wrapping overflow
  const rawNom = document.getElementById('clientNom').value || '—';
  const rawTel = document.getElementById('clientTel').value || '—';
  const rawEmail = document.getElementById('clientEmail').value || '—';
  const rawVille = document.getElementById('clientVille').value || '—';

  const nom = rawNom.length > 40 ? rawNom.substring(0, 37) + '...' : rawNom;
  const tel = rawTel;
  const email = rawEmail.length > 35 ? rawEmail.substring(0, 32) + '...' : rawEmail;
  const ville = rawVille.length > 40 ? rawVille.substring(0, 37) + '...' : rawVille;

  // Left Card: Client Details
  roundedCard(ML, y, cardW, 34, BG, BORDER_C, 3);
  text('INFORMATIONS CLIENT', ML + 5, y + 5, { size: 7, bold: true, color: MUTED_C });
  
  text('Nom / Établissement', ML + 5, y + 11, { size: 6.5, color: MUTED_C });
  text(nom, ML + 5, y + 15, { size: 8.5, bold: true });

  text('Contact & Adresse', ML + 5, y + 21, { size: 6.5, color: MUTED_C });
  text(`${tel}  ·  ${email}`, ML + 5, y + 25, { size: 8 });
  text(ville, ML + 5, y + 29, { size: 8 });

  // Right Card: Property Details
  const typeSelectedEl = document.querySelector('#typeGrid .check-item.checked');
  const typeSelectedText = typeSelectedEl ? labelText(typeSelectedEl) : '—';
  const superfSelected = document.querySelector('#superfGrid .check-item.checked');
  const superf = superfSelected ? labelText(superfSelected) : '—';

  roundedCard(ML + cardW + 6, y, cardW, 34, BG, BORDER_C, 3);
  text('CARACTÉRISTIQUES DU BIEN', ML + cardW + 11, y + 5, { size: 7, bold: true, color: MUTED_C });

  text('Type de bien', ML + cardW + 11, y + 11, { size: 6.5, color: MUTED_C });
  text(typeSelectedText, ML + cardW + 11, y + 15, { size: 8.5, bold: true });

  text('Superficie du bien', ML + cardW + 11, y + 21, { size: 6.5, color: MUTED_C });
  text(superf, ML + cardW + 11, y + 25, { size: 8.5, bold: true });

  y += 40; // Spacing gap below columns

  // ── 3. PRESTATIONS & OPTIONS TABLE ──────────────────────────────────────
  text('PRESTATIONS & OPTIONS DÉTAILLÉES', ML, y, { size: 7.5, bold: true, color: MUTED_C });
  
  const tableY = y + 5.5;
  const tableH = 74; // 7 rows × 9.3mm + 12mm header gap + 2mm breathing room

  // Step 1: Draw white fill only (no border yet)
  doc.setFillColor(...WHITE_C);
  doc.roundedRect(ML, tableY, CW, tableH, 3, 3, 'F');

  // Step 2: Header band — rounded top corners (matching radius=3 of outer card),
  //         flat bottom corners. Achieved by layering two fills edge-to-edge:
  //         a rounded rect (correct top) + a plain rect overdraw (kills bottom rounding).
  const headerH = 8;
  doc.setFillColor(...SECT_BG);
  doc.roundedRect(ML, tableY, CW, headerH, 3, 3, 'F');   // ← top corners correct
  doc.rect(ML, tableY + 3, CW, headerH - 3, 'F');        // ← flatten bottom corners

  // Step 3: Redraw border on top so it sits clean over the gray header
  doc.setDrawColor(...BORDER_C);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, tableY, CW, tableH, 3, 3, 'D');

  text('Prestation / Description', ML + 5, tableY + 5.5, { size: 7, bold: true, color: MUTED_C });
  text('Total', W - MR - 5, tableY + 5.5, { size: 7, bold: true, color: MUTED_C, align: 'right' });

  let rowY = tableY + headerH + 4.5; // first row starts right after the header band
  let rowIndex = 0;

  function optRow(label, desc, qty, prixUnit, total, isSelected) {
    // Flat row highlight — sharp rect, no rounded corners inside the table
    if (isSelected) {
      doc.setFillColor(...BLUE_LT);
      doc.rect(ML + 0.5, rowY - 4, CW - 1, 9, 'F');
    }

    // Custom charcoal square checkbox
    if (isSelected) {
      setColor(BLUE_C);
      doc.setFillColor(...BLUE_C);
      doc.roundedRect(ML + 4, rowY - 2.2, 2.5, 2.5, 0.5, 0.5, 'F');
    } else {
      setColor(BORDER_C, 'draw');
      doc.setLineWidth(0.3);
      doc.roundedRect(ML + 4, rowY - 2.2, 2.5, 2.5, 0.5, 0.5, 'D');
    }

    // Title and Description stacked vertically (zero horizontal overflow risk)
    text(label, ML + 9, rowY - 1.2, { size: 7.5, bold: isSelected, color: isSelected ? DARK_C : MUTED_C });
    text(desc, ML + 9, rowY + 2.3, { size: 6, color: MUTED_C });

    // Total
    text(isSelected && total !== null ? pdfFmt(total) + ' MAD' : '—', W - MR - 5, rowY + 0.2, { size: 7.5, bold: isSelected, align: 'right', color: isSelected ? DARK_C : MUTED_C });
    
    // Row divider
    if (rowIndex < 6) {
      hline(rowY + 5.15, [238, 239, 242]);
    }

    rowY += 9.3;
    rowIndex++;
  }

  // Populate Option Rows
  const tour3dPrice = getCalculatedTour3D();

  optRow('Tour 3D Interactif (Inclus d\'office)', 'Visite immersive 3D, lien de partage et code d\'intégration web direct', null, tour3dPrice, tour3dPrice, true);

  const optDefs = [
    { id: 'plan2d', label: 'Plan 2D / Floor Plan', desc: 'Plan d\'architecte 2D haute précision au format PDF et PNG' },
    { id: 'video', label: 'Vidéo Promotionnelle HD', desc: 'Vidéo teaser dynamique MP4 prête pour les réseaux sociaux' },
    { id: 'photos', label: 'Photos Haute Définition', desc: 'Pack de photos professionnelles grand angle extraites de la visite' },
    { id: 'tags', label: 'Tags Interactifs d\'information', desc: 'Points d\'intérêt cliquables (textes, images, liens marchands)', qty: 'tags' },
    { id: 'branding', label: 'Branding Personnalisé', desc: 'Logo d\'entreprise, couleurs et coordonnées intégrés dans l\'interface' },
    { id: 'gmaps', label: 'Publication Google Street View', desc: 'Intégration directe de la visite sur Google Maps et Street View' },
  ];

  optDefs.forEach(opt => {
    const row = document.querySelector(`[data-id="${opt.id}"]`);
    const sel = row && row.classList.contains('selected');
    let qty = null, prixUnit = getVal('price_' + opt.id), total = prixUnit;
    if (opt.qty === 'tags') {
      qty = getVal('qty_tags');
      total = prixUnit; // price_tags is already the combined total!
    }
    optRow(opt.label, opt.desc, qty, prixUnit, total, sel);
  });

  y += tableH + 11.5; // Spacing gap below table

  // ── 4. HÉBERGEMENT VIRTUEL CARD ─────────────────────────────────────────
  text('HÉBERGEMENT DE LA VISITE VIRTUELLE', ML, y, { size: 7.5, bold: true, color: MUTED_C });
  
  const hebY = y + 5.5;
  const hebH = 26;
  roundedCard(ML, hebY, CW, hebH, WHITE_C, BORDER_C, 3);

  const hebergSel = document.querySelector('#hebergGrid .heberg-item.selected');
  // Compare by radio VALUE, not textContent (which includes badge text like "30%")
  const hebergSelVal = hebergSel ? hebergSel.querySelector('input[type="radio"]').value : null;
  const durations = ['1 mois', '3 mois', '6 mois', '12 mois', '24 mois'];
  const durValues  = ['1', '3', '6', '12', '24'];
  const hpIds = ['hprice_1', 'hprice_3', 'hprice_6', 'hprice_12', 'hprice_24'];
  const cellW = 32.8;

  durations.forEach((dur, i) => {
    const isSelected = hebergSelVal === durValues[i];
    const px = ML + 3 + i * (32.8 + 2.5);
    
    // Highlight active duration with a solid dark card
    if (isSelected) {
      roundedCard(px, hebY + 5, cellW, 16, DARK_C, null, 2);
      text(dur, px + cellW / 2, hebY + 10.5, { size: 8.5, bold: true, align: 'center', color: WHITE_C });
      const hprice = getVal(hpIds[i]);
      text(hprice > 0 ? pdfFmt(hprice) + ' MAD' : '— MAD', px + cellW / 2, hebY + 16.5, { size: 7.5, align: 'center', color: [197, 198, 206], bold: true });
    } else {
      roundedCard(px, hebY + 5, cellW, 16, BG, BORDER_C, 2);
      text(dur, px + cellW / 2, hebY + 10.5, { size: 8, align: 'center', color: MUTED_C });
      const hprice = getVal(hpIds[i]);
      text(hprice > 0 ? pdfFmt(hprice) + ' MAD' : '— MAD', px + cellW / 2, hebY + 16.5, { size: 7, align: 'center', color: MUTED_C });
    }
  });

  y += hebH + 11.5;

  // ── 5. NOTES & CONDITIONS — SIDE BY SIDE (FULL WIDTH) ───────────────────
  const ncW = (CW - 6) / 2;   // each card ~87mm
  const ncH = 30;

  const notesVal = document.getElementById('notes').value.trim();
  roundedCard(ML, y, ncW, ncH, BG, BORDER_C, 3);
  text('NOTES / REMARQUES', ML + 5, y + 5.5, { size: 6.5, bold: true, color: MUTED_C });
  if (notesVal) {
    const lines = doc.splitTextToSize(notesVal, ncW - 10);
    lines.slice(0, 5).forEach((l, i) => text(l, ML + 5, y + 11 + i * 4, { size: 7 }));
  } else {
    text('Aucune remarque spécifique à signaler.', ML + 5, y + 11, { size: 7, color: MUTED_C, italic: true });
    text('Exécution selon la charte qualité', ML + 5, y + 16, { size: 7, color: MUTED_C, italic: true });
    text('standard d\'Immersio.', ML + 5, y + 21, { size: 7, color: MUTED_C, italic: true });
  }

  roundedCard(ML + ncW + 6, y, ncW, ncH, BG, BORDER_C, 3);
  text('CONDITIONS DE RÈGLEMENT', ML + ncW + 11, y + 5.5, { size: 6.5, bold: true, color: MUTED_C });
  text('· Acompte : 50% à la signature du devis', ML + ncW + 11, y + 12, { size: 7 });
  text('· Solde : 50% à la livraison finale du projet', ML + ncW + 11, y + 17, { size: 7 });
  text('· Délai : Livraison sous 48h ouvrées', ML + ncW + 11, y + 22, { size: 7 });
  text(`· Devis valable pendant ${validite} jours`, ML + ncW + 11, y + 27, { size: 6.5, color: MUTED_C });

  y += ncH + 5;

  // ── 6. GRAND TOTALS — FULL-WIDTH CARD ────────────────────────────────────
  const sub = (() => {
    let s = getCalculatedTour3D();
    ['plan2d', 'video', 'photos', 'branding', 'gmaps'].forEach(id => {
      if (document.querySelector(`[data-id="${id}"]`)?.classList.contains('selected')) s += getVal('price_' + id);
    });
    const tr = document.querySelector('[data-id="tags"]');
    if (tr?.classList.contains('selected')) s += getVal('price_tags');
    if (hebergSelVal) s += getVal('hprice_' + hebergSelVal);
    return s;
  })();
  const remisePct = getVal('remise');
  const remiseAmt = sub * remisePct / 100;
  const total = sub - remiseAmt;

  // Full-width light card background
  const totH = remisePct > 0 ? 30 : 22;
  roundedCard(ML, y, CW, totH, BG, BORDER_C, 3);

  // Subtotal line
  text('Sous-total HT', ML + 6, y + 8, { size: 8, color: MUTED_C });
  text(pdfFmt(sub) + ' MAD', W - MR - 6, y + 8, { size: 8, bold: true, align: 'right' });

  // Remise line
  if (remisePct > 0) {
    text(`Remise (${remisePct}%)`, ML + 6, y + 15, { size: 8, color: MUTED_C });
    text('— ' + pdfFmt(remiseAmt) + ' MAD', W - MR - 6, y + 15, { size: 8, color: [180, 80, 60], bold: true, align: 'right' });
  }

  // Dark total strip — bottom of card with flat-top / rounded-bottom
  const stripY = y + (remisePct > 0 ? 18 : 10);
  const stripH = y + totH - stripY;  // extends exactly to the card's bottom edge
  doc.setFillColor(...DARK_C);
  doc.roundedRect(ML, stripY, CW, stripH, 3, 3, 'F');   // bottom corners rounded
  doc.rect(ML, stripY, CW, stripH - 3, 'F');             // top corners flat
  // Redraw outer border on top
  doc.setDrawColor(...BORDER_C);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, totH, 3, 3, 'D');

  const stripMid = stripY + stripH / 2 + 3;
  text('TOTAL NET HT', ML + 6, stripMid, { size: 9.5, bold: true, color: WHITE_C });
  text(pdfFmt(total) + ' MAD', W - MR - 6, stripMid, { size: 11, bold: true, color: WHITE_C, align: 'right' });

  y += totH + 6;

  // ── 7. FOOTER BRAND SIGNATURE ───────────────────────────────────────────
  hline(H - 15);
  text('Immersio.  ·  immersio.ma  ·  contact@immersio.ma  ·  +212 708 71 72 77  ·  Rabat, Maroc', W / 2, H - 11, { size: 7.5, color: MUTED_C, align: 'center' });
  text('Ce document est généré électroniquement. Devis non contractuel.', W / 2, H - 6.5, { size: 6.5, color: MUTED_C, italic: true, align: 'center' });

  // Save
  const clientName = document.getElementById('clientNom').value.replace(/\s+/g, '_') || 'client';
  doc.save(`Devis_Immersio_${clientName}_${today.replace(/\//g, '-')}.pdf`);

  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Init
updateTotal();

// ── GOOGLE SHEETS EXPORT ────────────────────────────────────────────────────

async function saveToGoogleSheets() {
  const btn = document.getElementById('btn-save-sheets');
  const toast = document.getElementById('toast-sheets');
  const toastMsg = document.getElementById('toast-sheets-msg');
  const toastIcon = document.getElementById('toast-sheets-icon');

  if (APPS_SCRIPT_URL === "PASTE_YOUR_URL_HERE") {
    toast.style.background = "var(--red, #ef4444)";
    toast.style.color = "#fff";
    toastMsg.textContent = "URL Apps Script non configurée";
    toastIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
    return;
  }

  const typeSelectedEl = document.querySelector('#typeGrid .check-item.checked');
  const type_bien = typeSelectedEl ? labelText(typeSelectedEl) : '—';
  
  const superfSelected = document.querySelector('#superfGrid .check-item.checked');
  const superficie = superfSelected ? labelText(superfSelected) : '—';

  const tour3d_price = getCalculatedTour3D();

  const selectedOptions = [];
  let options_total = 0;
  const opts = ['plan2d', 'video', 'photos', 'branding', 'gmaps'];
  opts.forEach(id => {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row && row.classList.contains('selected')) {
      const name = row.querySelector('.opt-name').childNodes[0].textContent.trim();
      selectedOptions.push(name);
      options_total += getVal('price_' + id);
    }
  });

  const tagsRow = document.querySelector('[data-id="tags"]');
  if (tagsRow && tagsRow.classList.contains('selected')) {
    const name = tagsRow.querySelector('.opt-name').childNodes[0].textContent.trim();
    selectedOptions.push(name);
    options_total += getVal('price_tags');
  }

  const options_selected = selectedOptions.join(' + ');

  const hebergSel = document.querySelector('#hebergGrid .heberg-item.selected');
  const hebergement_duree = hebergSel ? hebergSel.querySelector('.heberg-duration').childNodes[0].textContent.trim() : '—';
  const hebergSelVal = hebergSel ? hebergSel.querySelector('input[type="radio"]').value : null;
  const hebergement_price = hebergSelVal ? getVal('hprice_' + hebergSelVal) : 0;

  const subtotal = tour3d_price + options_total + hebergement_price;
  const remise_pct = getVal('remise');
  const remise_amt = subtotal * remise_pct / 100;
  const total_ttc = subtotal - remise_amt;

  const payload = {
    client_nom: document.getElementById('clientNom').value,
    client_tel: document.getElementById('clientTel').value,
    client_email: document.getElementById('clientEmail').value,
    client_ville: document.getElementById('clientVille').value,
    type_bien: type_bien,
    superficie: superficie,
    tour3d_price: tour3d_price,
    options_selected: options_selected,
    options_total: options_total,
    hebergement_duree: hebergement_duree,
    hebergement_price: hebergement_price,
    subtotal: subtotal,
    remise_pct: remise_pct,
    remise_amt: remise_amt,
    total_ttc: total_ttc,
    notes: document.getElementById('notes').value,
    validite_jours: document.getElementById('validite').value,
    auto_pricing_used: manualOverrides.size === 0
  };

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"></circle></svg> Enregistrement…';

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow",
      mode: "no-cors"
    });

    toast.style.background = "#059669";
    toast.style.color = "#fff";
    toastMsg.textContent = "Devis enregistré dans Google Sheets ✓";
    toastIcon.innerHTML = '<polyline points="20 6 9 17 4 12" />';
  } catch (error) {
    toast.style.background = "#ef4444";
    toast.style.color = "#fff";
    toastMsg.textContent = "Erreur Google Sheets — " + error.message;
    toastIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }
}
