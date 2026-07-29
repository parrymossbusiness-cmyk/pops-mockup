// Pop's Barber & Beauty Shop — customer-facing booking widget
document.addEventListener('DOMContentLoaded', function () {
  var widget = document.getElementById('bookingWidget');
  if (!widget) return; // not on this page

  // Keep this in sync with functions/_lib/schedule.js
  var SERVICES = {
    "Haircut":                   { category: "barber" },
    "Kids' Cut":                  { category: "barber" },
    "Bang Trim / Neck Trim":       { category: "barber" },
    "Relaxer":                    { category: "beauty" },
    "Color":                      { category: "beauty" },
    "Flat Iron / Curling":         { category: "beauty" },
    "Highlights / Partial Foil":   { category: "beauty" },
    "Shampoo & Set":               { category: "beauty" },
    "Relax & Permanent":           { category: "beauty" },
  };

  var serviceSel = document.getElementById('bkService');
  var barberSel = document.getElementById('bkBarber');
  var dateInput = document.getElementById('bkDate');
  var slotsWrap = document.getElementById('bkSlots');
  var hint = document.getElementById('bkHint');
  var detailsWrap = document.getElementById('bkDetailsWrap');
  var nameInput = document.getElementById('bkName');
  var phoneInput = document.getElementById('bkPhone');
  var submitBtn = document.getElementById('bkSubmit');
  var confirmedBox = document.getElementById('bkConfirmed');
  var errorBox = document.getElementById('bkError');

  var selectedSlot = null;
  var barbersLoaded = [];
  var FALLBACK_BARBERS = [
    { id: 1, name: 'Pop' },
    { id: 2, name: 'Cheston' },
    { id: 3, name: 'Johnnie' },
    { id: 4, name: 'Stevie' },
  ];

  // Populate services
  Object.keys(SERVICES).forEach(function (name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    serviceSel.appendChild(opt);
  });

  // Today as the min selectable date, in the shop's local terms
  var today = new Date().toISOString().slice(0, 10);
  dateInput.min = today;

  fetch('/api/barbers').then(function (r) { return r.json(); }).then(function (data) {
    barbersLoaded = (data.barbers && data.barbers.length) ? data.barbers : FALLBACK_BARBERS;
    refreshBarberOptions();
  }).catch(function () {
    barbersLoaded = FALLBACK_BARBERS;
    refreshBarberOptions();
  });

  function refreshBarberOptions() {
    var category = SERVICES[serviceSel.value] ? SERVICES[serviceSel.value].category : 'barber';
    barberSel.innerHTML = '';
    var anyOpt = document.createElement('option');
    anyOpt.value = '';
    anyOpt.textContent = 'Any Available';
    barberSel.appendChild(anyOpt);

    if (category === 'barber') {
      barbersLoaded.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        barberSel.appendChild(opt);
      });
      barberSel.disabled = false;
    } else {
      // Beauty services: no named stylist on file yet, so lock to Any Available.
      barberSel.disabled = true;
    }
  }

  function resetDownstream() {
    selectedSlot = null;
    slotsWrap.innerHTML = '';
    detailsWrap.style.display = 'none';
    confirmedBox.style.display = 'none';
    errorBox.style.display = 'none';
  }

  function loadSlots() {
    resetDownstream();
    if (!dateInput.value || !serviceSel.value) {
      hint.textContent = 'Pick a service and date to see open times.';
      return;
    }
    hint.textContent = 'Loading open times…';

    var params = new URLSearchParams({ date: dateInput.value, service: serviceSel.value });
    if (barberSel.value) params.set('barberId', barberSel.value);

    fetch('/api/availability?' + params.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.slots || data.slots.length === 0) {
          hint.textContent = 'No open times that day, try another date.';
          return;
        }
        hint.textContent = 'Pick a time:';
        slotsWrap.innerHTML = '';
        data.slots.forEach(function (hhmm) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'slot-btn';
          btn.textContent = to12Hour(hhmm);
          btn.addEventListener('click', function () {
            document.querySelectorAll('.slot-btn.selected').forEach(function (b) { b.classList.remove('selected'); });
            btn.classList.add('selected');
            selectedSlot = hhmm;
            detailsWrap.style.display = 'block';
          });
          slotsWrap.appendChild(btn);
        });
      })
      .catch(function () { hint.textContent = 'Could not load times right now, please call instead.'; });
  }

  function to12Hour(hhmm) {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + parts[1] + ' ' + ampm;
  }

  serviceSel.addEventListener('change', function () { refreshBarberOptions(); loadSlots(); });
  barberSel.addEventListener('change', loadSlots);
  dateInput.addEventListener('change', loadSlots);

  submitBtn.addEventListener('click', function () {
    errorBox.style.display = 'none';
    if (!selectedSlot) return;
    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
      errorBox.textContent = 'Please add your name and phone number.';
      errorBox.style.display = 'block';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateInput.value,
        time: selectedSlot,
        service: serviceSel.value,
        barberId: barberSel.value ? parseInt(barberSel.value, 10) : null,
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
      }),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
        if (!res.ok) {
          errorBox.textContent = res.data.error || 'That time is no longer available, please pick another.';
          errorBox.style.display = 'block';
          loadSlots();
          return;
        }
        detailsWrap.style.display = 'none';
        slotsWrap.innerHTML = '';
        hint.textContent = '';
        confirmedBox.style.display = 'block';
        confirmedBox.innerHTML = 'You\'re booked for <strong>' + serviceSel.value + '</strong> on ' +
          dateInput.value + ' at ' + to12Hour(selectedSlot) + '. See you then, ' + nameInput.value.trim() + '!';
        confirmedBox.className = 'booking-confirmed';
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
        errorBox.textContent = 'Something went wrong, please call (870) 536-7677 to book instead.';
        errorBox.style.display = 'block';
      });
  });

  refreshBarberOptions();
});
