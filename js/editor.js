var generator;
var cellsCanvas, rulesCanvas;

function start() {
	generator = new lutGenerator(document.getElementById('cells'), document.getElementById('rules'));

	var updateButton = document.getElementById('update');
	updateButton.addEventListener('click', function(evt) {
		update();
	});

	update();
}

function update() {
	generator.reset();

	var config = document.getElementById('config');
	var content = config.value;

	generator.parse(content);

	generator.cellsCanvas.getContext('2d').putImageData(generator.cellsData, 0, 0);
	generator.rulesCanvas.getContext('2d').putImageData(generator.rulesData, 0, 0);

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