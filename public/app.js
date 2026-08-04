document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('contact-form');
  var emailInput = document.getElementById('sender-email');
  var messageInput = document.getElementById('message');
  var senderKeyInput = document.getElementById('sender-key');
  var statusBanner = document.getElementById('status-message');
  var submitBtn = document.getElementById('submit-btn');

  var lastCheckedEmail = '';

  function lockKeyField() {
    if (senderKeyInput.value.trim().startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
      senderKeyInput.readOnly = true;
      senderKeyInput.classList.add('key-locked');
    }
  }

  function unlockKeyField() {
    senderKeyInput.readOnly = false;
    senderKeyInput.classList.remove('key-locked');
  }

  function showStatus(text, type) {
    statusBanner.textContent = text;
    statusBanner.className = 'status ' + type;
  }

  function clearStatus() {
    statusBanner.textContent = '';
    statusBanner.className = 'status hidden';
  }

  async function lookupPGPKey(email) {
    if (!email || !email.includes('@') || email === lastCheckedEmail) return;
    lastCheckedEmail = email;
    if (senderKeyInput.value.trim() !== '') return;
    showStatus('Looking up key…', 'info');
      try {
        var response = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
        if (response.ok) {
          var keyText = await response.text();
          if (keyText && keyText.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
            senderKeyInput.value = keyText;
            lockKeyField();
            showStatus('Key found and attached', 'success');
            return;
          }
        }
        clearStatus();
      } catch (err) {
        clearStatus();
      }
  }

  senderKeyInput.addEventListener('input', function() {
    if (senderKeyInput.readOnly) return;
    lockKeyField();
  });

  emailInput.addEventListener('blur', function() {
    lookupPGPKey(emailInput.value.trim());
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearStatus();
    var email = emailInput.value.trim();
    var message = messageInput.value.trim();
    var senderKey = senderKeyInput.value.trim();
    if (!email || !message) {
      showStatus('Email and message required', 'error');
      return;
    }
    submitBtn.disabled = true;
    showStatus('Encrypting and sending…', 'info');
    try {
      var response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, message: message, senderPublicKey: senderKey })
      });
      var data = await response.json();
      if (response.ok && data.success) {
        showStatus('Message sent encrypted', 'success');
        form.reset();
        lastCheckedEmail = '';
      } else {
        showStatus(data.error || 'Failed to send', 'error');
      }
    } catch (err) {
      showStatus('Network error', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener('reset', function() {
    clearStatus();
    unlockKeyField();
    lastCheckedEmail = '';
  });
});
