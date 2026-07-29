// Pop's Barber & Beauty Shop — shared site behavior
document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.getElementById('hamburgerBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.classList.toggle('open', !isOpen);
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    });

    // Close mobile menu when a plain link is tapped
    mobileMenu.querySelectorAll('.mobile-sub a, .mobile-top-link').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Mobile accordion toggles (Services / About Us submenus)
  document.querySelectorAll('.mobile-accordion-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('aria-controls');
      var submenu = document.getElementById(targetId);
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (submenu) submenu.classList.toggle('open', !isOpen);
    });
  });

  // Close any open desktop dropdown if user clicks elsewhere (keyboard/touch safety net)
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.has-dropdown.open').forEach(function (li) {
      if (!li.contains(e.target)) li.classList.remove('open');
    });
  });
});
