Project Name: Gridworld Reinforcement Learning (HW1)

Description:
This project is an interactive web-based implementation of a Gridworld environment for Reinforcement Learning (RL), specifically designed for teaching and visualizing fundamental RL algorithms like Policy Evaluation and Value Iteration.

Features and Capabilities:
1. Environment Setup (HW1-1):
   - Dynamic grid sizes ranging from 5x5 to 9x9.
   - Interactive placement of Start point (Green), End point (Red/Target), and Obstacles (Gray crosses).
   - Generates and allows visualization of a fully randomized policy.

2. Policy Evaluation (HW1-2):
   - Computes state values V(s) for a randomized policy.
   - Evaluates expected rewards based on stepping into spaces (Penalty of -1 per step, Goal state V(s) = 0).
   - Shows the respective arrows for non-terminal and non-obstacle cells.

3. Optimal Policy via Value Iteration (HW1-3):
   - Uses the Value Iteration algorithm to compute the absolute optimal state values (V(s)) across the entire grid considering the obstacles and boundaries without a discount factor (gamma = 1.0).
   - Automatically derives the optimal policy (shortest path arrows, π(s)) from the computed optimal V(s).
   - Visually traces the shortest path from the Start to the End using a highlighted green path.

Architecture:
- Backend: Python Flask (`app.py`), utilizing NumPy for matrix/value calculations. Exposes a POST `/evaluate` endpoint.
- Frontend: HTML/CSS/JavaScript (`templates/index.html`, `static/style.css`, `static/script.js`). Handles drawing the grid, processing user clicks, and rendering value overlays with smooth CSS animations.

How to Run:
1. Ensure Python 3.x is installed.
2. Install dependencies: `pip install -r requirements.txt` (Mainly Flask and Numpy).
3. Start the server: `python app.py`
4. Open the displayed local server address (usually http://127.0.0.1:5000) in your web browser.
