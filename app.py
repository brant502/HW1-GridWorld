from flask import Flask, render_template, request, jsonify
import numpy as np
import random

app = Flask(__name__)

ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT']
ACTION_SYMBOLS = {'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→'}
DELTAS = {
    'UP':    (-1, 0),
    'DOWN':  ( 1, 0),
    'LEFT':  ( 0,-1),
    'RIGHT': ( 0, 1),
}


def evaluate_random_policy(n, start, end, obstacles, gamma=0.9, theta=1e-4, max_iterations=5000):
    obstacle_set = set(map(tuple, obstacles))
    end_tuple = tuple(end)
    start_tuple = tuple(start)

    # Assign a random policy to every non-terminal, non-obstacle cell
    policy = {}
    for r in range(n):
        for c in range(n):
            if (r, c) == end_tuple or (r, c) in obstacle_set:
                policy[(r, c)] = None
            else:
                policy[(r, c)] = random.choice(ACTIONS)

    # Initialize value function
    V = np.zeros((n, n))

    # Iterative policy evaluation
    for _ in range(max_iterations):
        delta = 0.0
        for r in range(n):
            for c in range(n):
                if (r, c) == end_tuple or (r, c) in obstacle_set:
                    continue
                action = policy[(r, c)]
                dr, dc = DELTAS[action]
                nr, nc = r + dr, c + dc
                # Stay in place if out-of-bounds or obstacle
                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_set:
                    nr, nc = r, c
                reward = -1.0
                new_v = reward + gamma * V[nr, nc]
                delta = max(delta, abs(new_v - V[r, c]))
                V[r, c] = new_v
        if delta < theta:
            break

    return policy, V

def value_iteration_optimal(n, start, end, obstacles, gamma=1.0, theta=1e-4, max_iterations=5000):
    obstacle_set = set(map(tuple, obstacles))
    end_tuple = tuple(end)
    start_tuple = tuple(start)

    # Initialize value function
    V = np.zeros((n, n))
    policy = {}

    # Value Iteration to find optimal V(s)
    for _ in range(max_iterations):
        delta = 0.0
        for r in range(n):
            for c in range(n):
                if (r, c) == end_tuple or (r, c) in obstacle_set:
                    continue
                
                v_old = V[r, c]
                max_v = -float('inf')
                
                for action in ACTIONS:
                    dr, dc = DELTAS[action]
                    nr, nc = r + dr, c + dc
                    # Stay in place if out-of-bounds or obstacle
                    if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_set:
                        nr, nc = r, c
                    
                    reward = -1.0
                    act_v = reward + gamma * V[nr, nc]
                    if act_v > max_v:
                        max_v = act_v
                
                V[r, c] = max_v
                delta = max(delta, abs(v_old - V[r, c]))
                
        if delta < theta:
            break
            
    # Derive optimal policy from optimal V(s)
    for r in range(n):
        for c in range(n):
            if (r, c) == end_tuple or (r, c) in obstacle_set:
                policy[(r, c)] = None
                continue
            
            best_action = None
            max_v = -float('inf')
            
            # Gather all best actions for tie-breaking
            best_actions = []
            
            for action in ACTIONS:
                dr, dc = DELTAS[action]
                nr, nc = r + dr, c + dc
                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_set:
                    nr, nc = r, c
                
                act_v = -1.0 + gamma * V[nr, nc]
                
                if abs(act_v - max_v) < 1e-6:
                    best_actions.append(action)
                elif act_v > max_v:
                    max_v = act_v
                    best_actions = [action]
            
            policy[(r, c)] = random.choice(best_actions) if best_actions else random.choice(ACTIONS)

    # Trace shortest path from start
    shortest_path = []
    current = start_tuple
    visited = set()
    
    # We only trace if we can reach the end, preventing infinite loops gracefully
    while current != end_tuple and current not in visited:
        visited.add(current)
        shortest_path.append(list(current))
        act = policy.get(current)
        if not act:
            break
        dr, dc = DELTAS[act]
        nr, nc = current[0] + dr, current[1] + dc
        if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_set:
            break # Hits wall or obstacle
        current = (nr, nc)
    
    if current == end_tuple:
        shortest_path.append(list(end_tuple))
    else:
        # If it doesn't reach the goal, we don't return a valid path
        shortest_path = []

    return policy, V, shortest_path

def build_response(n, policy_dict, V):
    policy_out = []
    values_out = []
    for r in range(n):
        policy_row = []
        values_row = []
        for c in range(n):
            act = policy_dict[(r, c)]
            policy_row.append(ACTION_SYMBOLS[act] if act else '')
            values_row.append(round(float(V[r, c]), 2))
        policy_out.append(policy_row)
        values_out.append(values_row)
    return policy_out, values_out

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.get_json()
    n         = int(data['n'])
    start     = data['start']      # [row, col]
    end       = data['end']        # [row, col]
    obstacles = data['obstacles']  # [[row, col], ...]
    algorithm = data.get('algorithm', 'value_iteration')

    if not (5 <= n <= 9):
        return jsonify({'error': 'n must be between 5 and 9'}), 400
    if not start or not end:
        return jsonify({'error': 'Start and end must be set'}), 400

    if algorithm == 'random_policy':
        policy_dict, V = evaluate_random_policy(n, start, end, obstacles, gamma=0.9)
        path = [] # Random policy doesn't guarantee a concise path
    else:
        policy_dict, V, path = value_iteration_optimal(n, start, end, obstacles, gamma=1.0)
        
    policy, values = build_response(n, policy_dict, V)
    return jsonify({'policy': policy, 'values': values, 'path': path})


if __name__ == '__main__':
    app.run(debug=True)
