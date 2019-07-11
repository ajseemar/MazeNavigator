var c, cc;

const index = (i, j, rows) => i + (j * rows);

const heuristic = (a, b) => {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    return Math.sqrt(dx * dx + dy * dy);
};

document.addEventListener("DOMContentLoaded", () => {
    c = document.getElementById('canvas');
    cc = c.getContext('2d');

    const MazeNavigatorDemo = new Game(c.width, c.height, 20);

    const startDemo = () => {
        let time = Date.now();
        let dt = (MazeNavigatorDemo.initialTime - time) / 1000.0;

        MazeNavigatorDemo.update(dt);
        MazeNavigatorDemo.render();

        MazeNavigatorDemo.initialTime = time;
        requestAnimationFrame(startDemo);
    }

    startDemo();
});

class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    // return the angle of the vector in radians
    getDirection() {
        return Math.atan2(this.y, this.x);
    };

    // set the direction of the vector in radians
    setDirection(direction) {
        var magnitude = this.getMagnitude();
        this.x = Math.cos(direction) * magnitude;
        this.y = Math.sin(direction) * magnitude;
        return this;
    };

    // get the magnitude of the vector
    getMagnitude() {
        // use pythagoras theorem to work out the magnitude of the vector
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    // set the magnitude of the vector
    setMagnitude(magnitude) {
        var direction = this.getDirection();
        this.x = Math.cos(direction) * magnitude;
        this.y = Math.sin(direction) * magnitude;
        return this;
    };

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
        // this.x += vector.x;
        // this.y += vector.y;
    }

    static sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
        // this.x -= vector.x;
        // this.y -= vectory.y;
    }

    static mult(v, scalar) {
        return new Vector(v.x * scalar, v.y * scalar);
        // this.x *= scalar;
        // this.y *= scalar;
    }

    static div(v, scalar) {
        return new Vector(v.x / scalar, v.y / scalar);
        // this.x /= scalar;
        // this.y /= scalar;
    }

    add(vector) {
        // return new Vector(this.x + vector.x, this.y + vector.y);
        // debugger
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    subtract(vector) {
        // return new Vector(this.x - vector.x, this.y - vector.y);
        this.x = vector.x - this.x;
        this.y = vector.y - this.y;
        return this;
    }

    multiply(scalar) {
        // return new Vector(this.x * scalar, this.y * scalar);
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divide(scalar) {
        // return new Vector(this.x / scalar, this.y / scalar);
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    dot(vector) {
        // debugger
        return (this.x * vector.x) + (this.y * vector.y);
    }

    angleBetween(vector, degrees) {
        const step = this.dot(vector) / (this.getMagnitude() * vector.getMagnitude());
        const theta = Math.acos(step);
        if (degrees) return theta * 180 / Math.PI;
        else return theta;
    }

    normalize() {
        const dist = this.getMagnitude();
        return new Vector(this.x / dist, this.y / dist);
    }

    project(vector) {
        const normal = vector.normalize();
        return normal.multiply(this.dot(normal));
    }

    limit(scalar) {
        const limited = this.normalize().multiply(Math.min(this.getMagnitude(), scalar));
        this.x = limited.x;
        this.y = limited.y;
        return this;
    }

    dist(vector) {
        const dx = vector.x - this.x;
        const dy = vector.y - this.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    static getNormalPoint(p, a, b) {
        const ap = Vector.sub(p, a);
        const ab = Vector.sub(b, a);

        const abNorm = ab.normalize();
        abNorm.multiply(ap.dot(abNorm));

        return Vector.add(a, abNorm);
    }
}

class Game {
    constructor(vpWidth, vpHeight, cellCount) {
        this.cellSize = vpWidth / cellCount; // renders entire map
        this.width = cellCount * this.cellSize;
        this.height = cellCount * this.cellSize;

        this.maze = new Maze(cellCount, vpWidth, vpHeight, this.cellSize);
        this.mazeSolver = new aStar(this.maze.grid);

        this.initialTime = Date.now();
        this.boids = [new Boid(0, 0), new Boid(10, 0), new Boid(0, 10),];
        setInterval(() => {
            this.boids.push(new Boid(0, 0));
            this.boids.push(new Boid(10, 0));
            this.boids.push(new Boid(0, 10));
        }, 2000);
    }



    update(dt) {
        this.mazeSolver.update();
        if (this.mazeSolver.finished) {
            this.boids.forEach(boid => {
                boid.follow(this.mazeSolver.path);
                boid.separate(this.boids);
                boid.update();
            });
        }
    }

    render() {
        cc.fillStyle = '#000';
        cc.fillRect(0, 0, c.width, c.height);
        this.maze.render();
        // this.mazeSolver.render();
        if (this.mazeSolver.finished) {
            this.boids.forEach(boid => {
                boid.render();
            });
        }
    }
}

class Entity {
    constructor(x, y) {
        this.position = new Vector(x, y);
        this.maxSpeed = 1000; // using dt in calculations...
        this.maxForce = 10000; // using dt in calculations...
        this.maxSpeed = 3;
        this.maxForce = 1;
        this.velocity = new Vector(this.maxSpeed, 0);
        this.acceleration = new Vector(0, 0);
        this.forces = {};
    }

    applyForce(force) {
        this.acceleration.add(force);
    }
}

class Boid extends Entity {
    constructor(x, y) {
        super(x, y);
        // this.maxForce = 1;
        this.radius = 5;
        this.perceptionRadius = this.radius * 2;
    }

    seek(target) {
        if (!target) return;
        let desired = Vector.sub(target, this.position);
        if (desired.getMagnitude() < 0.05) return;
        desired = desired.normalize().multiply(this.maxSpeed);
        const steering = Vector.sub(desired, this.velocity);
        steering.limit(this.maxForce);
        this.applyForce(steering);
    }

    arrive(target) {
        if (!target) return;
        const desired = Vector.sub(target, this.position);
        const d = desired.getMagnitude();

        if (d < this.perceptionRadius) {
            desired.setMagnitude(map(d, 0, this.perceptionRadius, 0, this.maxSpeed));
        } else desired.setMagnitude(this.maxSpeed);
        const steering = Vector.sub(desired, this.velocity).setMagnitude(this.maxForce);
        this.applyForce(steering);
    }

    follow(path) {
        const projection = this.velocity.normalize().multiply(this.perceptionRadius);
        this.predictedPos = Vector.add(this.position, projection);

        // let target = null;
        let winner = Infinity;

        for (let i = 0; i < path.points.length - 1; i++) {
            let a = path.points[i];
            let b = path.points[i + 1];


            let normalPoint = Vector.getNormalPoint(this.predictedPos, a, b);



            if (normalPoint.x < Math.min(a.x, b.x) || normalPoint.x > Math.max(a.x, b.x)) normalPoint = b.copy();
            else if (normalPoint.y < Math.min(a.y, b.y) || normalPoint.y > Math.max(a.y, b.y)) normalPoint = b.copy();

            const dist = this.predictedPos.dist(normalPoint);
            if (dist < winner) {
                winner = dist;
                this.normal = normalPoint.copy();
                const dir = Vector.sub(b, a).normalize();
                dir.multiply(this.perceptionRadius);
                this.target = Vector.add(this.normal, dir);
            }

        }
        this.seek(this.target);
    }

    separate(boids) {
        const sum = new Vector();
        let count = 0;
        boids.forEach(boid => {
            const dist = this.position.dist(boid.position);

            if (dist > 0 && dist < this.perceptionRadius * 2) {
                const diff = Vector.sub(this.position, boid.position).normalize();
                sum.add(diff);
                count++;
            }
        });

        if (count > 0) {
            sum.divide(count);
            sum.setMagnitude(this.maxSpeed);
            const steering = Vector.sub(sum, this.velocity);
            steering.limit(this.maxForce);
            this.applyForce(steering);
        }
    }

    // checkBounds() {
    //     if (this.position.x - this.radius > c.width) this.position.x = -this.radius;
    //     if (this.position.x + this.radius < 0) this.position.x = c.width + this.radius;
    //     if (this.position.y + this.radius > c.height) this.position.y = -this.radius;
    //     if (this.position.y - this.radius < 0) this.position.y = c.height + this.radius;
    // }

    update(dt) {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);

        // this.velocity.add(this.acceleration.multiply(dt));
        // this.position.add(this.velocity.multiply(dt));
        this.acceleration.multiply(0);

        // this.checkBounds();
    }

    render() {
        // predicted position
        // cc.fillStyle = "#f00";
        // cc.beginPath();
        // cc.arc(this.predictedPos.x, this.predictedPos.y, this.radius / 3, 0, 2 * Math.PI);
        // cc.closePath();
        // cc.fill();

        // boid
        cc.fillStyle = "#0f0";
        cc.beginPath();
        cc.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        cc.closePath();
        cc.fill();

        // normal point on path relative to predicted pos
        // cc.fillStyle = "#0ff";
        // cc.beginPath();
        // cc.arc(this.normal.x, this.normal.y, this.radius / 3, 0, 2 * Math.PI);
        // cc.closePath();
        // cc.fill();

        // target point on path boid aims to seek
        // cc.fillStyle = "#fff";
        // cc.beginPath();
        // cc.arc(this.target.x, this.target.y, this.radius / 3, 0, 2 * Math.PI);
        // cc.closePath();
        // cc.fill();
    }
}

class Path {
    constructor(points) {
        this.points = points || [];
        this.radius = 20;
    }

    addPoint(point) {
        this.points.unshift(point);
    }

    getStart() {
        return this.points[0];
    }

    getEnd() {
        return this.points[this.points.length - 1];
    }

    render() {
        let current, next;
        // debugger
        for (let i = 0; i < this.points.length - 1; i++) {
            cc.strokeStyle = "#f00";
            cc.strokeWidth = 2;
            current = this.points[i];
            next = this.points[i + 1];
            cc.beginPath();
            cc.moveTo(current.x, current.y);
            cc.lineTo(next.x, next.y);
            cc.stroke();
            cc.closePath();
        }
    }
}

class aStar {
    constructor(grid) {
        this.grid = grid;
        this.cells = grid.cells;
        this.start = this.cells[0];
        this.end = this.cells[this.cells.length - 1];
        console.log(this.start, this.end);

        this.openSet = [this.start];
        this.closedSet = [];
        this.path = new Path();
        this.finished = false;
    }

    update() {
        if (this.openSet.length > 0) {
            let winner = 0;
            this.openSet.forEach((cell, idx) => {
                // debugger
                if (cell.node.f < this.openSet[winner].node.f) winner = idx;
                // debugger
            });

            const current = this.openSet[winner];
            // this.path = [];
            // let temp = current.node;
            // this.path.push(temp);
            // while (temp.parent) {
            //     this.path.push(temp.parent);
            //     temp = temp.parent;
            // }

            // this.path = new Path();
            // let temp = current.node;
            // // this.path.push(temp);
            // this.path.addPoint(new Vector(temp.position.x, temp.position.y));
            // while (temp.parent) {
            //     this.path.addPoint(new Vector(temp.parent.position.x, temp.parent.position.y));
            //     // this.path.push(temp.parent);
            //     temp = temp.parent;
            // }

            if (current === this.end) {
                // this.path = [];
                let temp = current.node;
                // this.path.push(temp);
                // debugger
                this.path.addPoint(new Vector(temp.position.x, temp.position.y));
                while (temp.parent) {
                    this.path.addPoint(new Vector(temp.parent.position.x, temp.parent.position.y));
                    // this.path.push(temp.parent);
                    temp = temp.parent;
                }
                console.log('DONE');
                this.finished = true;
                // debugger
                // console.log(this.path);
                this.openSet = [];
                return;
            }
            // remove current from open set
            for (let i = this.openSet.length - 1; i >= 0; i--) {
                if (this.openSet[i] === current) {
                    this.openSet.splice(i, 1);
                    break;
                }
            }
            // add current to closed set 
            // debugger
            const neighbors = current.neighbors.filter(obj => !Object.keys(current.walls)
                .includes(Object.keys(obj)[0]))
                .map(obj => Object.values(obj)[0]);
            // debugger
            // console.log(neighbors);
            neighbors.forEach(neighbor => {
                if (!this.closedSet.includes(neighbor)) {
                    const tentativeG = current.node.g + 1;
                    let newPath = false;
                    if (this.openSet.includes(neighbor) && tentativeG < neighbor.node.g) {
                        neighbor.node.g = tentativeG;
                        newPath = true;
                    } else {
                        neighbor.node.g = tentativeG;
                        this.openSet.push(neighbor);
                        newPath = true;
                    }

                    if (newPath) {
                        neighbor.node.h = heuristic(neighbor.node, this.end.node);
                        neighbor.node.f = neighbor.node.g + neighbor.node.h;
                        neighbor.node.parent = current.node;
                    }
                }
            });
            this.closedSet.push(current);
            // debugger
        }
    }

    render() {
        // if (!this.finished) {
        //     this.openSet.forEach(cell => cell.render('#0f0'));
        //     this.closedSet.forEach(cell => cell.render('#f00'));
        // }
        // this.path.forEach(node => {
        //     // node.render();
        //     cc.strokeStyle = "#0f0";
        //     cc.beginPath();
        //     if (node.parent)
        //         cc.moveTo(node.parent.position.x, node.parent.position.y);
        //     else
        //         cc.moveTo(node.position.x, node.position.y);
        //     cc.lineTo(node.position.x, node.position.y);
        //     cc.closePath();
        //     cc.stroke();
        // });
        if (this.finished)
            this.path.render();
        // this.cells.forEach(cell => cell.node.render());
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Wall {
    constructor(p1, p2) {
        this.p1 = p1
        this.p2 = p2

        this.a = this.p2.y - this.p1.y;
        this.b = this.p1.x - this.p2.x;
        this.c = this.a * this.p1.x + this.b * this.p1.y;
    }

    render() {
        cc.beginPath();
        cc.moveTo(this.p1.x, this.p1.y);
        cc.lineTo(this.p2.x, this.p2.y);
        cc.closePath();
        cc.stroke();
    }
}

class Node {
    constructor(i, j, size) {
        this.position = {
            x: (j * size) + (size / 2),
            y: (i * size) + (size / 2)
        };
        this.neighbors = {
            "north": Infinity,
            "east": Infinity,
            "south": Infinity,
            "west": Infinity
        };
        this.size = size / 15;
        this.f = 0;
        this.g = this.h = 0;
        this.cost = 1;
        this.visited = false;
        this.closed = false;
        this.parent = null
    }

    render(color) {
        cc.beginPath();
        cc.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
        cc.closePath();
        cc.fillStyle = '#f0f';
        cc.fill();


    }
}

class Cell {
    constructor(row, col, size) {
        this.row = row;
        this.col = col;
        this.size = size;
        // console.log(this.size);
        this.visited = false;
        this.neighbors = [];
        this.node = new Node(row, col, size);
        this.walls = {
            "north": new Wall(
                new Point(this.col * this.size, this.row * this.size),
                new Point((this.col * this.size) + this.size, this.row * this.size)
            ),
            "east": new Wall(
                new Point((this.col * this.size) + this.size, this.row * this.size),
                new Point((this.col * this.size) + this.size, (this.row * this.size) + this.size)
            ),
            "south": new Wall(
                new Point((this.col * this.size), (this.row * this.size) + this.size),
                new Point((this.col * this.size) + this.size, (this.row * this.size) + this.size)
            ),
            "west": new Wall(
                new Point(this.col * this.size, this.row * this.size),
                new Point(this.col * this.size, (this.row * this.size) + this.size)
            )
        }
    }

    render(color) {
        if (color) {
            cc.fillStyle = color;
            cc.fillRect(this.col * this.size + this.size / 4, this.row * this.size + this.size / 4, this.size - this.size / 4 * 2, this.size - this.size / 4 * 2);
        } else {

            cc.strokeStyle = "#53A1F3";
            Object.values(this.walls).forEach(({ p1, p2 }) => {
                cc.beginPath();
                cc.moveTo(p1.x, p1.y);
                cc.lineTo(p2.x, p2.y);
                cc.closePath();
                cc.stroke();
            });

        }
        // this.node.render(cc);
    }
}

class Grid {
    constructor(size, w, h, cellSize) {
        this.cc = cc;
        this.cells = new Array(size * size);
        this.size = {
            w: w,
            h: h
        };
        this.cellCount = size;

        this.cellSize = cellSize;

        this.populateGrid();
        this.populateCells();
    }

    populateGrid() {
        for (let j = 0; j < this.cellCount; j++) {
            for (let i = 0; i < this.cellCount; i++) {
                this.cells[index(i, j, this.cellCount)] = new Cell(i, j, this.cellSize);
            }
        }
    }

    populateCells() {
        for (let i = 0; i < this.cells.length; i++)
            Grid.populateCellWithNeighbors(this.cells[i], this.cells, this.cellCount, this.cc);
    }

    static populateCellWithNeighbors(cell, cells, size, cc) {
        if (cells[index(cell.row - 1, cell.col, size)]) {
            if (cell.row - 1 >= 0) {
                cell.neighbors.push({ 'north': cells[index(cell.row - 1, cell.col, size)] });
            }
        }
        if (cells[index(cell.row, cell.col + 1, size)]) {
            cell.neighbors.push({ 'east': cells[index(cell.row, cell.col + 1, size)] });
        }
        if (cells[index(cell.row + 1, cell.col, size)]) {
            if (cell.row + 1 <= size - 1) {
                cell.neighbors.push({ 'south': cells[index(cell.row + 1, cell.col, size)] });
            }
        }
        if (cells[index(cell.row, cell.col - 1, size)]) {
            cell.neighbors.push({ 'west': cells[index(cell.row, cell.col - 1, size)] });
        }

        cell.neighbors.forEach(cellN => {
            cc.fillStyle = "#9A66AC";
            cc.fillRect(cellN.row * cellN.size, cellN.col * cellN.size, cellN.size, cellN.size);
        });
    }

    render() {
        for (let j = 0; j < this.cellCount; j++) {
            for (let i = 0; i < this.cellCount; i++) {
                let cell = this.cells[index(j, i, this.cellCount)];
                cell.render();
            }
        }
    }
}
class Maze {
    constructor(size, width, height, cellSize) {
        this.cellCount = size;
        this.width = width;
        this.height = height;
        this.grid = new Grid(this.cellCount, this.width, this.height, cellSize);

        this.generateMaze();
    }


    generateMaze() {
        let currentCell = this.grid.cells[0];
        currentCell.visited = true;
        const stack = [currentCell];

        while (stack.length !== 0) {
            let neighbors = currentCell.neighbors.filter(obj => {
                let cell = Object.values(obj)[0];
                if (!cell) return null;
                return !cell.visited;
            });

            let neighborDir;
            let neighbor;

            let neighborObj = neighbors[Math.floor(Math.random() * neighbors.length)];
            if (neighborObj) {
                neighborDir = Object.keys(neighborObj)[0];
                neighbor = neighborObj[neighborDir];
            }

            if (neighborObj === undefined) {
                currentCell = stack.pop();
            }
            else {
                neighbor.visited = true;
                switch (neighborDir) {
                    case "north":
                        delete currentCell.walls["north"];
                        delete neighbor.walls["south"];
                        currentCell.node.neighbors["north"] = 1;
                        neighbor.node.neighbors["south"] = 1;
                        break;
                    case "east":
                        delete currentCell.walls["east"];
                        delete neighbor.walls["west"];
                        currentCell.node.neighbors["east"] = 1;
                        neighbor.node.neighbors["west"] = 1;
                        break;
                    case "south":
                        delete currentCell.walls["south"];
                        delete neighbor.walls["north"];
                        currentCell.node.neighbors["south"] = 1;
                        neighbor.node.neighbors["north"] = 1;
                        break;
                    case "west":
                        delete currentCell.walls["west"];
                        delete neighbor.walls["east"];
                        currentCell.node.neighbors["west"] = 1;
                        neighbor.node.neighbors["east"] = 1;
                        break;
                }
                stack.push(neighbor);
                currentCell = neighbor;
            }
        }
    }

    render() {
        this.grid.render();
    }
}