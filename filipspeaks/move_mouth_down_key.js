
$(document).ready(function() {

	window.addEventListener('keydown', function (e){
		var mouth = document.getElementById("mouth");
		if(e.keyCode == 40){
		//$("#mouth").animate({top: "61.5%"}, 50);
			$("#mouth").animate({top: "+=50px"}, 50);
		}
	});

	window.addEventListener('keyup', function (e){
		var mouth = document.getElementById("mouth");
		if(e.keyCode == 40){
			$("#mouth").animate({top: "57.6%"}, 50);
		}
	});

});