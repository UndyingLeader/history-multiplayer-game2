PROGRESSIVE ERA LIVE - MULTIPLAYER

This is a real-time 48-question open-ended game for friends on different devices.

DEPLOY TO RENDER (requires free GitHub and Render accounts):
1. Unzip the folder and upload its files to a new GitHub repository.
2. Go to https://dashboard.render.com/ and choose New > Web Service.
3. Connect your GitHub repository.
4. Runtime: Node; Build Command: npm install; Start Command: npm start.
5. Choose a free instance if offered, then Deploy.
6. Open the https://YOUR-SERVICE.onrender.com URL. Create Room and send that URL and six-digit room code to friends.

All players must join before the host starts. Host can reveal early or wait 45 seconds per question.
The server must remain running for players to connect. A free host may take time to wake up.

Local testing: install Node.js; run npm install, then npm start; visit http://localhost:3000.

Scoring uses matching phrases/keywords, not AI evaluation. Some valid answers may not be recognized. Edit questions.json to add alternative accepted phrases.
