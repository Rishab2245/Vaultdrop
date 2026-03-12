#!/bin/bash
# stripe-dev.sh
# Starts Stripe CLI webhook forwarding and auto-injects the webhook secret into .env

set -e

ENV_FILE="$(dirname "$0")/.env"
FORWARD_TO="http://localhost:4000/webhooks/stripe"
STRIPE_BIN="/Users/rishab/.local/bin/stripe"

echo "🔐 Starting Stripe CLI webhook forwarding..."
echo "   Forwarding to: $FORWARD_TO"
echo ""

# Run stripe listen with API key (no browser login needed)
"$STRIPE_BIN" listen \
  --forward-to "$FORWARD_TO" \
  --events payment_intent.succeeded,payment_intent.payment_failed | while IFS= read -r line; do
  echo "$line"

  # Extract webhook secret when stripe prints it
  if echo "$line" | grep -q "whsec_"; then
    WEBHOOK_SECRET=$(echo "$line" | grep -o 'whsec_[A-Za-z0-9]*')
    if [ -n "$WEBHOOK_SECRET" ]; then
      echo ""
      echo "✅ Webhook secret captured: $WEBHOOK_SECRET"
      echo "   Writing to .env..."

      if grep -q "^STRIPE_WEBHOOK_SECRET=" "$ENV_FILE"; then
        sed -i '' "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" "$ENV_FILE"
      else
        echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> "$ENV_FILE"
      fi

      echo "   ✅ .env updated."
      echo ""
    fi
  fi
done
