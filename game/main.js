const DOWN  = 2;
const LEFT  = 3;
const RIGHT = 1;
const UP    = 0;

const MAX_X = 16;
const MAX_Y = 10;

const TIPS = {
	10 : 'Pick up waste with [SPACE], drop them off at the matching facility with [SPACE]',
	20 : 'Waste storage is first in, last out. Plan accordingly.',
	30 : 'Your drone can only hold 8 items in storage at a time.',
	60 : 'If the facility floor exceeds the weight limit, the evaluation is terminated.',
	90 : 'The evaluation is nearly complete, good luck.'
};

in_game   = false;
is_moving = false;

level     = 1;
timer     = 0;
weight    = 0;
points    = 0;

next_drop = null;
next_trash = [
	'glass',
	'plastic',
	'metal'
].sort( function() {
	return Math.random() - 0.5
});

facilities = [];
trash = {};

drone = {
	x: Math.floor(MAX_X / 2),
	y: Math.floor(MAX_Y / 2),
	moved: 0,
	facing: 0,
	cargo: [],
	interact: function(){
		var x = this.x;
		var y = this.y;
		
		if (this.facing == UP) {
			y--;
		} else if (this.facing == RIGHT) {
			x++;
		} else if (this.facing == DOWN) {
			y++;
		} else if (this.facing == LEFT) {
			x--;
		}
		
		if (drone.cargo.length < 8) {
			if (trash[x + '.' + y] && trash[x + '.' + y][0]) {
				var type = trash[x + '.' + y].slice(-1)[0];
				var z = trash[x + '.' + y].length;
				
				if ($('entity[type="warning"][x="' + x + '"][y="' + y + '"]').length || !$('entity[type="' + type + '"][x="' + x + '"][y="' + y + '"][z="' + z + '"]').length) {
					return false;
				}
				
				weight--;
	
				this.cargo.push(trash[x + '.' + y].pop());
				$('entity[type="' + type + '"][x="' + x + '"][y="' + y + '"][z="' + z + '"]').remove();
				
				$('#cargo').append('<li type="' + this.cargo.slice(-1) + '"></li>');
				
				$('.highlighted').removeClass('highlighted');
				$('[type="' + type.replace('trash-', 'facility-') + '"]').addClass('highlighted');
			}
		}
		
		facilities.forEach(function(facility){
			if (facility.x == x && facility.y == y) {
				if (facility.accepts == drone.cargo.slice(-1)[0]) {
					drone.cargo.pop();
					
					points++;
					
					$('#cargo li').last().remove();
					$('.highlighted').removeClass('highlighted');
					
					if (drone.cargo.length) {
						var next = drone.cargo.slice(-1)[0];
						
						$('[type="' + next.replace('trash-', 'facility-') + '"]').addClass('highlighted');
					}
				}
			}
		});
	},
	rotate: function(direction){
		drone.facing = direction;
		$('entity[type="drone"]').attr('facing', drone.facing);
	},
	move: function (direction) {
		if (this.canMove()) {
			if (direction == UP) {
				if (this.y - 1 >= 0 && !isBlocked(this.x, this.y - 1)) {
					this.y--;
					this.moved = Date.now();
				}
			} else if (direction == RIGHT) {
				if (this.x + 1 < MAX_X && !isBlocked(this.x + 1, this.y)) {
					this.x++;
					this.moved = Date.now();
				}
			} else if (direction == DOWN) {
				if (this.y + 1 < MAX_Y && !isBlocked(this.x, this.y + 1)) {
					this.y++;
					this.moved = Date.now();
				}
			} else if (direction == LEFT) {
				if (this.x - 1 >= 0 && !isBlocked(this.x - 1, this.y)) {
					this.x--;
					this.moved = Date.now();
				}
			}
			
			$('entity[type="drone"]').attr('x', this.x).attr('y', this.y);
		}
	},
	canMove: function () {
		return this.moved + 140 <= Date.now();
	}
};

$(document).ready(function () {
	$('[screen="menu"] .button').on('click', function () {
		showScreen('intro');
		
		setTimeout(function(){
			showScreen('game');
			startGame();
		}, 6000);
	});
	
	$('[screen="gameover"] .button').on('click', function () {
		window.location.reload();
	});
	
	$('body').on('keydown', function (e) {
		if (!in_game) {
			return false;
		}
		
		switch (e.which) {
			case 40 :
			case 83 :
				drone.rotate(DOWN);
				is_moving    = true;
				break;
			case 37 :
			case 65 :
				drone.rotate(LEFT);
				is_moving    = true;
				break;
			case 39 :
			case 68 :
				drone.rotate(RIGHT);
				is_moving    = true;
				break;
			case 38 :
			case 87 :
				drone.rotate(UP);
				is_moving    = true;
				break;
		}
	}).on('keyup', function () {
		is_moving = false;
	}).on('keypress', function (e) {
		if (e.which == 32) {
			drone.interact();
		}
	});
	
	setInterval(function () {
		gameLoop();
	}, 50);
	
	setInterval(function () {
		if (in_game) {
			timer++;
			
			if (TIPS[timer]) {
				showTip(TIPS[timer]);
			}
			
			level = Math.min(10, Math.floor(timer / 60));
			
			if (timer == 5 || timer == 30 || timer == 90 || timer == 180) {
				if (next_trash.length) {
					spawnEntity('facility-' + next_trash.pop());
				}
			}
			
			$('#timer').text(('00' + Math.floor(timer / 60)).slice(-2) + ':' + ('00' + (timer % 60 ? timer % 60 : '00')).slice(-2));
		}
	}, 1000);
});

function gameLoop() {
	if (in_game) {
		$('#weight').text(weight + '/75 lbs');
		
		if (weight >= 50) {
			if (weight >= 75) {
				endGame();
			} else {
				$('#weight').addClass('danger');
			}
		} else {
			$('#weight').removeClass('danger');
		}
		
		if (is_moving) {
			drone.move(drone.facing);
		}
		
		if (next_drop <= Date.now()) {
			var amount = 1 + Math.floor(Math.random() * 3);
			
			next_drop = Date.now() + ((11 - level) * 250);
			
			for (var i = 0; i < amount; i++) {
				var type = facilities[Math.floor(Math.random() * facilities.length)].accepts;
				spawnEntity(type);
			}
		}
	}
}

function showScreen(screen) {
	$('[screen]').addClass('inactive');
	$('[screen="' + screen + '"]').removeClass('inactive');
}

function showTip(text){
	$('#tips').append('<span class="tip">' + text + '</span>');
}

function startGame() {
	level = 1;
	
	next_drop = Date.now() + 5000;
	
	generateWorld();
	showTip('Use [W][S][A][D] or the Arrow keys to move your drone');
	
	in_game = true;
}

function endGame(){
	var grades = ['F', 'D', 'C', 'B', 'A'];
	var grade = 0;
	in_game = false;
	
	showScreen('gameover');
	
	if (points >= 30) {
		grade++;
	}
	
	if (points >= 60) {
		grade++;
	}
	
	if (timer >= 120) {
		grade ++;
	}
	
	if (timer >= 180) {
		grade ++;
	}
	
	$('#points span').text(points);
	$('#grade span').text(grades[grade]);
	$('#time span').text(('00' + Math.floor(timer / 60)).slice(-2) + ':' + ('00' + (timer % 60 ? timer % 60 : '00')).slice(-2));
}

function generateWorld() {
	var map = $('#map');
	
	map.css({
		height: (MAX_Y * 48) + 'px',
		perspective: ((MAX_X * 48) * 2) + 'px',
		width: (MAX_X * 48) + 'px'
	});
	
	map.find('#scene').append('<entity type="drone" x="' + drone.x + '" y="' + drone.y + '" facing="2"><div class="wrapper"><div class="left"></div><div class="right"></div><div class="front"></div><div class="back"></div><div class="top"></div></div></entity>');
}

function spawnEntity(type) {
	var map = $('#map');
	
	var x = Math.floor(Math.random() * MAX_X);
	var y = Math.floor(Math.random() * MAX_Y);
	var z = 1;
	
	// check if the player is there or any other entity.
	if (isBlocked(x, y)) {
		if (type.startsWith('trash-')) {
			if (trash[x + '.' + y] && trash[x + '.' + y].length && trash[x + '.' + y].length < 4) {
				trash[x + '.' + y].push(type);
				z += trash[x + '.' + y].length - 1;
				weight++;
			} else {
				return spawnEntity(type);
			}
		} else {
			return spawnEntity(type);
		}
	} else {
		if (type.startsWith('trash-')) {
			if (trash[x + '.' + y]) {
				trash[x + '.' + y].push(type);
			} else {
				trash[x + '.' + y] = [type];
			}
			
			z += trash[x + '.' + y].length - 1;
			weight++;
		}
	}
	
	if (type.startsWith('facility-')) {
		facilities.push({
			type : type,
			accepts : type.replace('facility-', 'trash-'),
			x : x,
			y : y,
			queue : 0
		});
	}
	
	map.find('#scene').append('<entity type="warning" x="' + x + '" y="' + y + '">!</entity>');
	
	setTimeout(function () {
		$('entity[type="warning"][x="' + x + '"][y="' + y + '"]').remove();
		
		map.find('#scene').append('<entity class="' + (Math.random() >= 0.5 ? 'std' : 'alt') + '" type="' + type + '" x="' + x + '" y="' + y + '" z="' + z + '"></entity>');
	}, 5500);
}

function isBlocked(x, y) {
	var blocked = false;
	
	if (drone.x == x && drone.y == y) {
		blocked = true;
	}
	
	if (trash[x + '.' + y] && trash[x + '.' + y].length) {
		blocked = true;
	}
	
	facilities.forEach(function(facility){
		if (facility.x == x && facility.y == y) {
			blocked = true;
		}
	});
	
	return blocked;
}