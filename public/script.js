/* ========================================
   AI Faceless Instagram Mastery - Scripts
   Full Backend Integration
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ---- State ----
  let currentUser = null;
  let authToken = localStorage.getItem('auth_token');

  // ---- Toast Notification ----
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-notification';
  document.body.appendChild(toastEl);

  function showToast(msg, type = 'success') {
    toastEl.textContent = msg;
    toastEl.className = `toast-notification ${type} show`;
    setTimeout(() => toastEl.classList.remove('show'), 3500);
  }

  // ---- API Helper ----
  async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  // ---- Check existing auth on load ----
  async function checkAuth() {
    if (!authToken) return;
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      updateUIForLoggedInUser();
    } catch {
      authToken = null;
      localStorage.removeItem('auth_token');
    }
  }
  checkAuth();

  function updateUIForLoggedInUser() {
    const navCta = document.querySelector('.navbar-cta');
    if (navCta && currentUser) {
      if (currentUser.is_enrolled) {
        navCta.innerHTML = `<span class="user-indicator">✓ Enrolled — ${currentUser.name.split(' ')[0]}</span>`;
      } else {
        navCta.innerHTML = `
          <span style="color:var(--text-muted);font-size:0.82rem;margin-right:8px;">Hi, ${currentUser.name.split(' ')[0]}</span>
          <button class="btn btn-primary cta-enroll" style="padding:10px 24px;font-size:0.85rem;">Enroll Now</button>
        `;
        navCta.querySelector('.cta-enroll')?.addEventListener('click', handleEnrollClick);
      }
    }
  }

  // ---- Navbar scroll effect ----
  const navbar = document.querySelector('.navbar');
  function handleNavScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleNavScroll);
  handleNavScroll();

  // ---- Mobile menu toggle ----
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Smooth scroll ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ---- Scroll reveal animations ----
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ---- FAQ Accordion ----
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = '0';
      });
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ---- Counter animation ----
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 2000;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * target);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = prefix + target.toLocaleString() + suffix;
    }
    requestAnimationFrame(update);
  }

  // ---- Floating elements parallax ----
  document.addEventListener('mousemove', (e) => {
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    document.querySelectorAll('.floating-element').forEach((el, i) => {
      const speed = (i + 1) * 5;
      el.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`;
    });
  });

  // ---- Countdown Timer ----
  function startCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    if (!timerEl) return;

    // Set deadline to end of today
    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(23, 59, 59, 999);

    function updateTimer() {
      const remaining = deadline - new Date();
      if (remaining <= 0) {
        timerEl.textContent = '00:00:00';
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    updateTimer();
    setInterval(updateTimer, 1000);
  }
  startCountdown();

  // ---- Dynamic year ----
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ==========================================================================
  // AUTH MODAL
  // ==========================================================================
  const authModal = document.getElementById('authModal');
  const authModalClose = document.getElementById('authModalClose');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  // Tab switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    });
  });

  function openAuthModal() {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
    loginError.style.display = 'none';
    registerError.style.display = 'none';
  }

  authModalClose.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPassword').value
        })
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('auth_token', authToken);
      closeAuthModal();
      showToast(`Welcome back, ${currentUser.name}!`);
      updateUIForLoggedInUser();

      // If user is not enrolled, proceed to payment
      if (!currentUser.is_enrolled) {
        initiatePayment();
      }
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.style.display = 'none';
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('regName').value,
          email: document.getElementById('regEmail').value,
          phone: document.getElementById('regPhone').value,
          password: document.getElementById('regPassword').value
        })
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('auth_token', authToken);
      closeAuthModal();
      showToast(`Account created! Welcome, ${currentUser.name}!`);
      updateUIForLoggedInUser();

      // Proceed to payment
      initiatePayment();
    } catch (err) {
      registerError.textContent = err.message;
      registerError.style.display = 'block';
    }
  });

  // ==========================================================================
  // ENROLLMENT / PAYMENT FLOW
  // ==========================================================================
  function handleEnrollClick() {
    if (!currentUser) {
      openAuthModal();
    } else if (currentUser.is_enrolled) {
      showToast('You are already enrolled! 🎉');
    } else {
      initiatePayment();
    }
  }

  // All CTA buttons
  document.querySelectorAll('.cta-enroll').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleEnrollClick();
    });
  });

  async function initiatePayment() {
    try {
      showToast('Preparing payment...');
      const data = await api('/api/payments/create-order', { method: 'POST' });

      // Check if Razorpay script is loaded
      if (typeof Razorpay === 'undefined') {
        // Razorpay SDK not loaded - show mock success for dev
        showToast('Razorpay SDK not loaded. In production, add the Razorpay checkout script.', 'error');

        // For development: simulate payment verification with mock
        if (data.order_id.startsWith('order_mock_')) {
          const verifyData = await api('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: data.order_id,
              razorpay_payment_id: 'pay_mock_' + Date.now(),
              razorpay_signature: 'mock_signature_dev'
            })
          });
          // This will fail signature verification, which is correct for dev
        }
        return;
      }

      // Real Razorpay checkout
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'AI Faceless Instagram Mastery',
        description: 'Complete Course + All Bonuses',
        order_id: data.order_id,
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone || ''
        },
        theme: { color: '#8b5cf6' },
        handler: async function (response) {
          try {
            const verifyData = await api('/api/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            currentUser = verifyData.user;
            updateUIForLoggedInUser();
            document.getElementById('successModal').classList.add('active');
          } catch (err) {
            showToast('Payment verification failed: ' + err.message, 'error');
          }
        },
        modal: {
          ondismiss: function () {
            showToast('Payment cancelled', 'error');
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      showToast('Payment error: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // CONTACT FORM
  // ==========================================================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('contactError');
      const successEl = document.getElementById('contactSuccess');
      errEl.style.display = 'none';
      errEl.className = 'form-error';
      successEl.style.display = 'none';
      successEl.className = 'form-success';

      try {
        const data = await api('/api/contact', {
          method: 'POST',
          body: JSON.stringify({
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value
          })
        });
        successEl.textContent = data.message;
        successEl.style.display = 'block';
        successEl.className = 'form-success show';
        contactForm.reset();
        showToast('Message sent successfully!');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        errEl.className = 'form-error show';
      }
    });
  }

  // ==========================================================================
  // DYNAMIC TESTIMONIALS FROM API
  // ==========================================================================
  async function loadTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    try {
      const data = await api('/api/testimonials');
      const testimonials = data.testimonials;

      if (testimonials.length === 0) {
        // Fallback static testimonials
        container.innerHTML = `
          <div class="testimonial-card glass-card reveal visible">
            <div class="testimonial-header">
              <img src="testimonial_1.png" alt="Student" class="testimonial-avatar" />
              <div><div class="testimonial-name">Arjun M.</div><div class="testimonial-role">College Student</div></div>
            </div>
            <div class="testimonial-stars">★★★★★</div>
            <p class="testimonial-text">Amazing course! The AI tools section alone is worth the entire price.</p>
          </div>`;
        return;
      }

      const avatars = ['testimonial_1.png', 'testimonial_2.png', 'testimonial_3.png', 'testimonial_4.png'];
      container.innerHTML = testimonials.map((t, i) => `
        <div class="testimonial-card glass-card reveal">
          <div class="testimonial-header">
            <img src="${t.avatar_url || avatars[i % avatars.length]}" alt="${t.name}" class="testimonial-avatar" />
            <div>
              <div class="testimonial-name">${t.name}</div>
              <div class="testimonial-role">${t.role || 'Student'}</div>
            </div>
          </div>
          <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
          <p class="testimonial-text">${t.text}</p>
        </div>
      `).join('');

      // Re-observe new elements for scroll reveal
      container.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    } catch (err) {
      console.warn('Failed to load testimonials:', err);
      // Keep any static fallback that may be in HTML
    }
  }
  loadTestimonials();

  // ---- Close modals on Escape key ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    }
  });

  // ---- Staggered card animations ----
  document.querySelectorAll('.outcome-card, .bonus-card, .testimonial-card, .module-item, .who-card').forEach((card, i) => {
    card.style.transitionDelay = `${(i % 7) * 0.05}s`;
  });

  console.log('🚀 AI Faceless Instagram Mastery — Full Stack Site Loaded');
});
