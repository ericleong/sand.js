var config;
var cellsCanvas, rulesCanvas;

function start() {
	config = new Config(document.getElementById('cells'), document.getElementById('rules'));

	var updateButton = document.getElementById('update');
	updateButton.addEventListener('click', function(evt) {
		update();
	});

	update();
}

function update() {
	config.reset();

	var config = document.getElementById('config');
	var content = config.value;

	config.parse(content);

	config.cellsCanvas.getContext('2d').putImageData(config.cellsData, 0, 0);
	config.rulesCanvas.getContext('2d').putImageData(config.rulesData, 0, 0);

	var cellsDownload = document.getElementById('download-cells');
	cellsDownload.href = generator.cellsCanvas.toDataURL();
	cellsDownload.download = 'cells.png';

	var rulesDownload = document.getElementById('download-rules');
	rulesDownload.href = generator.rulesCanvas.toDataURL();
	rulesDownload.download = 'rules.png';

	var configDownload = document.getElementById('download-config');
	configDownload.href = 'data:,' + encodeURIComponent(content);
	configDownload.download = 'config.txt';
}