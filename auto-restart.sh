#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date '+%H:%M:%S')] Starting Next.js..." >> /home/z/my-project/dev.log
  npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  EXITCODE=$?
  echo "[$(date '+%H:%M:%S')] Server exited (code=$EXITCODE), restarting in 1s..." >> /home/z/my-project/dev.log
  sleep 1
done
