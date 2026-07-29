// Pop's Barber & Beauty Shop — shared shop calendar (admin.html)
document.addEventListener('DOMContentLoaded', function () {
  var lockScreen = document.getElementById('lockScreen');
  var calendarShell = document.getElementById('calendarShell');
  var pinInput = document.getElementById('pinInput');
  var pinSubmit = document.getElementById('pinSubmit');
  var pinError = document.getElementById('pinError');
  var calDate = document.getElementById('calDate');
  var bookingList = document.getElementById('bookingList');
  var blockList = document.getElementById('blockList');
  var blockToggle = document.getElementById('blockToggle');
  var blockForm = document.getElementById('blockForm');
  var blockBarber = document.getElementById('blockBarber');
  var blockStart = document.getElementById('blockStart');
  var blockEnd = document.getElementById('blockEnd');
  var blockReason = document.getElementById('blockReason');
  var blockSubmit = document.getElementById('blockSubmit');

  var pin = localStorage.getItem('popsAdminPin') || '';

  function apiFetch(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['X-Admin-Pin'] = pin;
    return fetch(path, options);
  }

  function tryUnlock(candidatePin) {
    pin = candidatePin;
    var today = new Date().toISOString().slice(0, 10);
    apiFetch('/api/admin/bookings?date=' + today).then(function (r) {
      if (r.status === 401) {
        pinError.style.display = 'block';
        pin = '';
        return;
      }
      localStorage.setItem('popsAdminPin', pin);
      lockScreen.style.display = 'none';
      calendarShell.style.display = 'block';
      calDate.value = today;
      loadBarbers();
      loadDay();
    }).catch(function () {
      pinError.textContent = 'Could not connect, try again.';
      pinError.style.display = 'block';
    });
  }

  pinSubmit.addEventListener('click', function () { tryUnlock(pinInput.value.trim()); });
  if (pin) tryUnlock(pin); // auto-unlock if we already have a saved PIN

  function loadBarbers() {
    fetch('/api/barbers').then(function (r) { return r.json(); }).then(function (data) {
      (data.barbers || []).forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        blockBarber.appendChild(opt);
      });
    });
  }

  function to12Hour(iso) {
    var d = new Date(iso);
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m + ' ' + ampm;
  }

  function loadDay() {
    bookingList.innerHTML = '<li>Loading…</li>';
    blockList.innerHTML = '<li>Loading…</li>';
    apiFetch('/api/admin/bookings?date=' + calDate.value)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderBookings(data.bookings || []);
        renderBlocks(data.blocks || []);
      });
  }

  function renderBookings(bookings) {
    bookingList.innerHTML = '';
    if (bookings.length === 0) {
      bookingList.innerHTML = '<li>No bookings yet for this day.</li>';
      return;
    }
    bookings.forEach(function (b) {
      var li = document.createElement('li');
      var who = b.barber_name || 'Any Available';
      li.innerHTML = '<div><strong>' + to12Hour(b.start_time) + '</strong> &middot; ' + b.service_name +
        ' &middot; ' + who + '<div class="meta">' + b.customer_name + ' &middot; <a href="tel:' + b.customer_phone + '">' + b.customer_phone + '</a></div></div>';
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'admin-block-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', function () {
        if (!confirm('Cancel this booking?')) return;
        apiFetch('/api/admin/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: b.id }),
        }).then(loadDay);
      });
      li.appendChild(cancelBtn);
      bookingList.appendChild(li);
    });
  }

  function renderBlocks(blocks) {
    blockList.innerHTML = '';
    if (blocks.length === 0) {
      blockList.innerHTML = '<li>None</li>';
      return;
    }
    blocks.forEach(function (b) {
      var li = document.createElement('li');
      var who = b.barber_name || 'Whole Shop';
      li.innerHTML = '<div><strong>' + to12Hour(b.start_time) + '–' + to12Hour(b.end_time) + '</strong> &middot; ' + who +
        (b.reason ? '<div class="meta">' + b.reason + '</div>' : '') + '</div>';
      blockList.appendChild(li);
    });
  }

  calDate.addEventListener('change', loadDay);

  blockToggle.addEventListener('click', function () {
    blockForm.style.display = blockForm.style.display === 'none' ? 'block' : 'none';
  });

  blockSubmit.addEventListener('click', function () {
    if (!blockStart.value || !blockEnd.value) return;
    apiFetch('/api/admin/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberId: blockBarber.value ? parseInt(blockBarber.value, 10) : null,
        date: calDate.value,
        startTime: blockStart.value,
        endTime: blockEnd.value,
        reason: blockReason.value.trim(),
      }),
    }).then(function () {
      blockForm.style.display = 'none';
      blockStart.value = '';
      blockEnd.value = '';
      blockReason.value = '';
      loadDay();
    });
  });
});
