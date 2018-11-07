var camera, controls, scene, renderer;
var stats;
var cube;
var keyboard = new KeyboardState();
var numbertagList = [];
var guiTag = [];
var guiAnnotationClasses = new dat.GUI();
var guiBoundingBoxAnnotationMap = {};
var guiOptions = new dat.GUI();
var boundingBox3DArray = [];
var folder_position = [];
var folder_size = [];
var bboxFlag = true;
var clickFlag = false;
var clickedObjectIndex = -1;
var mouseDown = {x: 0, y: 0};
var mouseUp = {x: 0, y: 0};
var clickedPoint = THREE.Vector3();
var groundClickedPoint;
var groundPlaneArray = [];
var clickedPlaneArray = [];
var ground_mesh;
var birdViewFlag = true;
var moveFlag = false;
var cls = 0;
var cFlag = false;
var rFlag = false;
var rotation_bbox_index = -1;
var copy_bbox_index = -1;

var parametersBoundingBox = {
    "Vehicle": function () {
        classesBoundingBox.select("Vehicle");
        $('#class-picker ul li').css('background-color', '#323232');
        $($('#class-picker ul li')[0]).css('background-color', '#525252');
    },
    "Truck": function () {
        classesBoundingBox.select("Truck");
        $('#class-picker ul li').css('background-color', '#323232');
        $($('#class-picker ul li')[1]).css('background-color', '#525252');
    },
    "Motorcycle": function () {
        classesBoundingBox.select("Motorcycle");
        $('#class-picker ul li').css('background-color', '#323232');
        $($('#class-picker ul li')[2]).css('background-color', '#525252');
    },
    "Bicycle": function () {
        classesBoundingBox.select("Bicycle");
        $('#class-picker ul li').css('background-color', '#323232');
        $($('#class-picker ul li')[3]).css('background-color', '#525252');
    },
    "Pedestrian": function () {
        classesBoundingBox.select("Pedestrian");
        $('#class-picker ul li').css('background-color', '#323232');
        $($('#class-picker ul li')[4]).css('background-color', '#525252');
    },
};

var parameters = {

        save: function () {
            save();
        },
        download: function () {
            download();
        },
        view_mode: 'Image and point cloud',
        annotation_mode:
            'Bounding Boxes',
        i:
            -1,
        hold_bbox_flag:
            false,
        bird_view:
            function () {
                bird_view();
            }
        ,
        camera_view: function () {
            camera_view();
        }
        ,
        update_database: function () {
            labelTool.archiveWorkFiles();
        }
    }
;

labelTool.onInitialize("PCD", function () {
    if (!Detector.webgl) Detector.addGetWebGLMessage();
    init();
    animate();
});

var rotWorldMatrix;

// Rotate an object around an arbitrary axis in world space
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    //  rotWorldMatrix.multiply(object.matrix);
    // new code for Three.JS r55+:
    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js pre r59:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // code for r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}

var rotObjectMatrix;

function rotateAroundObjectAxis(object, axis, radians) {
    rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    // object.matrix.multiplySelf(rotObjectMatrix);      // post-multiply
    // new code for Three.JS r55+:
    object.matrix.multiply(rotObjectMatrix);

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js r50-r58:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // new code for Three.js r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}

PrismGeometry = function (vertices, height) {

    var Shape = new THREE.Shape();

    (function f(ctx) {

        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (var i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.lineTo(vertices[0].x, vertices[0].y);

    })(Shape);

    var settings = {};
    settings.amount = height;
    settings.bevelEnabled = false;
    THREE.ExtrudeGeometry.call(this, Shape, settings);

};
PrismGeometry.prototype = Object.create(THREE.ExtrudeGeometry.prototype);

// Visualize 2d and 3d data
labelTool.onLoadData("PCD", function () {
    // $("#jpeg-label-canvas").show();
    // changeCanvasSize($("#canvas3d").width() / 4, $("#canvas3d").width() * 5 / 32);

    // var obj_loader = new THREE.OBJLoader();
    // var obj_url = labelTool.workBlob + '/PCDPoints_orig/' + labelTool.fileNames[labelTool.currentFileIndex] + 'all.pcd';
    // obj_loader.load(obj_url, function (mesh) {
    //     scene.add(mesh);
    //     ground_mesh = mesh;
    //     labelTool.hasPCD = true;
    // });

    // ASCII pcd files
    var pcd_loader = new THREE.PCDLoader();
    var pcd_url = labelTool.workBlob + '/PCDPoints/all_scenes/' + labelTool.fileNames[labelTool.currentFileIndex] + '.pcd';
    pcd_loader.load(pcd_url, function (mesh) {
        // var xAxis = new THREE.Vector3(0, 0, 1);
        //rotateAroundWorldAxis(mesh, xAxis, 2 * Math.PI / 180);
        // rotateAroundObjectAxis(mesh, xAxis, 2 * Math.PI / 180);
        scene.add(mesh);
        ground_mesh = mesh;
        labelTool.hasPCD = true;
    });

    // show FOV of camera within 3D pointcloud
    labelTool.removeObject('rightplane');
    labelTool.removeObject('leftplane');
    labelTool.removeObject('prism');
    labelTool.drawFieldOfView();
});

// TODO: test onselect method (open folder if selected)
annotationObjects.onSelect(function (newIndex, oldIndex) {
    clickedPlaneArray = [];
    for (var i = 0; i < bboxFolders.length; i++) {
        if (bboxFolders[i] != undefined) {
            bboxFolders[i].close();
        }
    }
    if (bboxFolders[newIndex] != undefined) {
        bboxFolders[newIndex].open();
    }
    if (folder_position[newIndex] != undefined) {
        folder_position[newIndex].open();
    }
    if (folder_size[newIndex] != undefined) {
        folder_size[newIndex].open();
    }
});

//add remove function in dat.GUI
dat.GUI.prototype.removeFolder = function (name) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }

    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
};

//read local calibration file.
function readYAMLFile(filename) {
    var rawFile = new XMLHttpRequest();
    var hasCameraExtrinsicMatrix = false;
    var cameraParameters = [];
    rawFile.open("GET", filename, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                for (var i = 0; i < allText.split("\n").length; i++) {
                    if (allText.split("\n")[i].split(":")[0].trim() == 'CameraExtrinsicMat') {
                        hasCameraExtrinsicMatrix = true;
                    }
                    if (hasCameraExtrinsicMatrix && allText.split("\n")[i].split(":")[0].trim() == 'data') {
                        for (m = 0; m < allText.split("\n")[i].split(":")[1].split("[")[1].split(",").length - 1; m++) {
                            var each_param = parseFloat(allText.split("\n")[i].split(":")[1].split("[")[1].split(",")[m])
                            cameraParameters.push(each_param)
                        }
                        while (cameraParameters.length < 12) {
                            i = i + 1
                            for (m = 0; m < allText.split("\n")[i].trim().split(",").length - 1; m++) {
                                var paramameter = parseFloat(allText.split("\n")[i].trim().split(",")[m]);
                                cameraParameters.push(paramameter)
                            }
                        }
                        labelTool.cameraMatrix = [[parseFloat(cameraParameters[0]), parseFloat(cameraParameters[1]), parseFloat(cameraParameters[2]), parseFloat(cameraParameters[3])],
                            [parseFloat(cameraParameters[4]), parseFloat(cameraParameters[5]), parseFloat(cameraParameters[6]), parseFloat(cameraParameters[7])],
                            [parseFloat(cameraParameters[8]), parseFloat(cameraParameters[9]), parseFloat(cameraParameters[10]), parseFloat(cameraParameters[11])],
                            [0, 0, 0, 1]];
                        hasCameraExtrinsicMatrix = false;
                        if (isNaN(inverseMatrix(labelTool.cameraMatrix)[0][0]) == true) {
                            alert("calibration parameter is wrong");
                            labelTool.cameraMatrix = [[1, 0, 0, 0],
                                [parseFloat(cameraParameters[4]), parseFloat(cameraParameters[5]), parseFloat(cameraParameters[6]), parseFloat(cameraParameters[7])],
                                [parseFloat(cameraParameters[8]), parseFloat(cameraParameters[9]), parseFloat(cameraParameters[10]), parseFloat(cameraParameters[11])],
                                [0, 0, 0, 1]];
                        }
                        break;
                    }
                }
            }
        }
    };
    rawFile.send(null);
}

//calculate inverse matrix
function inverseMatrix(inMax) {
    let det = (inMax[0][0] * inMax[1][1] * inMax[2][2] * inMax[3][3]) + (inMax[0][0] * inMax[1][2] * inMax[2][3] * inMax[3][1]) + (inMax[0][0] * inMax[1][3] * inMax[2][1] * inMax[3][2])
        - (inMax[0][0] * inMax[1][3] * inMax[2][2] * inMax[3][1]) - (inMax[0][0] * inMax[1][2] * inMax[2][1] * inMax[3][3]) - (inMax[0][0] * inMax[1][1] * inMax[2][3] * inMax[3][2])
        - (inMax[0][1] * inMax[1][0] * inMax[2][2] * inMax[3][3]) - (inMax[0][2] * inMax[1][0] * inMax[2][3] * inMax[3][1]) - (inMax[0][3] * inMax[1][0] * inMax[2][1] * inMax[3][2])
        + (inMax[0][3] * inMax[1][0] * inMax[2][2] * inMax[3][1]) + (inMax[0][2] * inMax[1][0] * inMax[2][1] * inMax[3][3]) + (inMax[0][1] * inMax[1][0] * inMax[2][3] * inMax[3][2])
        + (inMax[0][1] * inMax[1][2] * inMax[2][0] * inMax[3][3]) + (inMax[0][2] * inMax[1][3] * inMax[2][0] * inMax[3][1]) + (inMax[0][3] * inMax[1][1] * inMax[2][0] * inMax[3][2])
        - (inMax[0][3] * inMax[1][2] * inMax[2][0] * inMax[3][1]) - (inMax[0][2] * inMax[1][1] * inMax[2][0] * inMax[3][3]) - (inMax[0][1] * inMax[1][3] * inMax[2][0] * inMax[3][2])
        - (inMax[0][1] * inMax[1][2] * inMax[2][3] * inMax[3][0]) - (inMax[0][2] * inMax[1][3] * inMax[2][1] * inMax[3][0]) - (inMax[0][3] * inMax[1][1] * inMax[2][2] * inMax[3][0])
        + (inMax[0][3] * inMax[1][2] * inMax[2][1] * inMax[3][0]) + (inMax[0][2] * inMax[1][1] * inMax[2][3] * inMax[3][0]) + (inMax[0][1] * inMax[1][3] * inMax[2][2] * inMax[3][0]);
    let inv00 = (inMax[1][1] * inMax[2][2] * inMax[3][3] + inMax[1][2] * inMax[2][3] * inMax[3][1] + inMax[1][3] * inMax[2][1] * inMax[3][2] - inMax[1][3] * inMax[2][2] * inMax[3][1] - inMax[1][2] * inMax[2][1] * inMax[3][3] - inMax[1][1] * inMax[2][3] * inMax[3][2]) / det;
    let inv01 = (-inMax[0][1] * inMax[2][2] * inMax[3][3] - inMax[0][2] * inMax[2][3] * inMax[3][1] - inMax[0][3] * inMax[2][1] * inMax[3][2] + inMax[0][3] * inMax[2][2] * inMax[3][1] + inMax[0][2] * inMax[2][1] * inMax[3][3] + inMax[0][1] * inMax[2][3] * inMax[3][2]) / det;
    let inv02 = (inMax[0][1] * inMax[1][2] * inMax[3][3] + inMax[0][2] * inMax[1][3] * inMax[3][1] + inMax[0][3] * inMax[1][1] * inMax[3][2] - inMax[0][3] * inMax[1][2] * inMax[3][1] - inMax[0][2] * inMax[1][1] * inMax[3][3] - inMax[0][1] * inMax[1][3] * inMax[3][2]) / det;
    let inv03 = (-inMax[0][1] * inMax[1][2] * inMax[2][3] - inMax[0][2] * inMax[1][3] * inMax[2][1] - inMax[0][3] * inMax[1][1] * inMax[2][2] + inMax[0][3] * inMax[1][2] * inMax[2][1] + inMax[0][2] * inMax[1][1] * inMax[2][3] + inMax[0][1] * inMax[1][3] * inMax[2][2]) / det;
    let inv10 = (-inMax[1][0] * inMax[2][2] * inMax[3][3] - inMax[1][2] * inMax[2][3] * inMax[3][0] - inMax[1][3] * inMax[2][0] * inMax[3][2] + inMax[1][3] * inMax[2][2] * inMax[3][0] + inMax[1][2] * inMax[2][0] * inMax[3][3] + inMax[1][0] * inMax[2][3] * inMax[3][2]) / det;
    let inv11 = (inMax[0][0] * inMax[2][2] * inMax[3][3] + inMax[0][2] * inMax[2][3] * inMax[3][0] + inMax[0][3] * inMax[2][0] * inMax[3][2] - inMax[0][3] * inMax[2][2] * inMax[3][0] - inMax[0][2] * inMax[2][0] * inMax[3][3] - inMax[0][0] * inMax[2][3] * inMax[3][2]) / det;
    let inv12 = (-inMax[0][0] * inMax[1][2] * inMax[3][3] - inMax[0][2] * inMax[1][3] * inMax[3][0] - inMax[0][3] * inMax[1][0] * inMax[3][2] + inMax[0][3] * inMax[1][2] * inMax[3][0] + inMax[0][2] * inMax[1][0] * inMax[3][3] + inMax[0][0] * inMax[1][3] * inMax[3][2]) / det;
    let inv13 = (inMax[0][0] * inMax[1][2] * inMax[2][3] + inMax[0][2] * inMax[1][3] * inMax[2][0] + inMax[0][3] * inMax[1][0] * inMax[2][2] - inMax[0][3] * inMax[1][2] * inMax[2][0] - inMax[0][2] * inMax[1][0] * inMax[2][3] - inMax[0][0] * inMax[1][3] * inMax[2][2]) / det;
    let inv20 = (inMax[1][0] * inMax[2][1] * inMax[3][3] + inMax[1][1] * inMax[2][3] * inMax[3][0] + inMax[1][3] * inMax[2][0] * inMax[3][1] - inMax[1][3] * inMax[2][1] * inMax[3][0] - inMax[1][1] * inMax[2][0] * inMax[3][3] - inMax[1][0] * inMax[2][3] * inMax[3][1]) / det;
    let inv21 = (-inMax[0][0] * inMax[2][1] * inMax[3][3] - inMax[0][1] * inMax[2][3] * inMax[3][0] - inMax[0][3] * inMax[2][0] * inMax[3][1] + inMax[0][3] * inMax[2][1] * inMax[3][0] + inMax[0][1] * inMax[2][0] * inMax[3][3] + inMax[0][0] * inMax[2][3] * inMax[3][1]) / det;
    let inv22 = (inMax[0][0] * inMax[1][1] * inMax[3][3] + inMax[0][1] * inMax[1][3] * inMax[3][0] + inMax[0][3] * inMax[1][0] * inMax[3][1] - inMax[0][3] * inMax[1][1] * inMax[3][0] - inMax[0][1] * inMax[1][0] * inMax[3][3] - inMax[0][0] * inMax[1][3] * inMax[3][1]) / det;
    let inv23 = (-inMax[0][0] * inMax[1][1] * inMax[2][3] - inMax[0][1] * inMax[1][3] * inMax[2][0] - inMax[0][3] * inMax[1][0] * inMax[2][1] + inMax[0][3] * inMax[1][1] * inMax[2][0] + inMax[0][1] * inMax[1][0] * inMax[2][3] + inMax[0][0] * inMax[1][3] * inMax[2][1]) / det;
    let inv30 = (-inMax[1][0] * inMax[2][1] * inMax[3][2] - inMax[1][1] * inMax[2][2] * inMax[3][0] - inMax[1][2] * inMax[2][0] * inMax[3][1] + inMax[1][2] * inMax[2][1] * inMax[3][0] + inMax[1][1] * inMax[2][0] * inMax[3][2] + inMax[1][0] * inMax[2][2] * inMax[3][1]) / det;
    let inv31 = (inMax[0][0] * inMax[2][1] * inMax[3][2] + inMax[0][1] * inMax[2][2] * inMax[3][0] + inMax[0][2] * inMax[2][0] * inMax[3][1] - inMax[0][2] * inMax[2][1] * inMax[3][0] - inMax[0][1] * inMax[2][0] * inMax[3][2] - inMax[0][0] * inMax[2][2] * inMax[3][1]) / det;
    let inv32 = (-inMax[0][0] * inMax[1][1] * inMax[3][2] - inMax[0][1] * inMax[1][2] * inMax[3][0] - inMax[0][2] * inMax[1][0] * inMax[3][1] + inMax[0][2] * inMax[1][1] * inMax[3][0] + inMax[0][1] * inMax[1][0] * inMax[3][2] + inMax[0][0] * inMax[1][2] * inMax[3][1]) / det;
    let inv33 = (inMax[0][0] * inMax[1][1] * inMax[2][2] + inMax[0][1] * inMax[1][2] * inMax[2][0] + inMax[0][2] * inMax[1][0] * inMax[2][1] - inMax[0][2] * inMax[1][1] * inMax[2][0] - inMax[0][1] * inMax[1][0] * inMax[2][2] - inMax[0][0] * inMax[1][2] * inMax[2][1]) / det;

    return [[inv00, inv01, inv02, inv03], [inv10, inv11, inv12, inv13], [inv20, inv21, inv22, inv23], [inv30, inv31, inv32, inv33]]
}

//calculate product of matrix
function matrixProduct(inMax1, inMax2) {
    var outMax = [0, 0, 0, 0];
    outMax[0] = inMax1[0][0] * inMax2[0] + inMax1[0][1] * inMax2[1] + inMax1[0][2] * inMax2[2] + inMax1[0][3] * inMax2[3];
    outMax[1] = inMax1[1][0] * inMax2[0] + inMax1[1][1] * inMax2[1] + inMax1[1][2] * inMax2[2] + inMax1[1][3] * inMax2[3];
    outMax[2] = inMax1[2][0] * inMax2[0] + inMax1[2][1] * inMax2[1] + inMax1[2][2] * inMax2[2] + inMax1[2][3] * inMax2[3];
    outMax[3] = inMax1[3][0] * inMax2[0] + inMax1[3][1] * inMax2[1] + inMax1[3][2] * inMax2[2] + inMax1[3][3] * inMax2[3];
    return outMax;
}

//load pcd data and image data
function data_load() {
    labelTool.showData();
}

//save data
function save() {
    // ground_mesh.visible = false;
    labelTool.savedFrames[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex] = true;
    // labelTool.changeFrame(labelTool.currentFileIndex);
    // download annotations
    // var annotations = labelTool.createAnnotations();
    // annotationContentJSON = JSON.stringify(annotations);
}

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

function changeViewMode(viewMode) {
    if (viewMode == 'Image') {
        // hide 3d canvas
        $('#canvas3d').hide();
        // show image
        $("#jpeg-label-canvas").show();
        changeCanvasSize($("#canvas3d").width(), $("#canvas3d").height());

    } else if (viewMode == 'Point cloud') {
        // first hide camera image
        $("#jpeg-label-canvas").hide();
        // show 3d canvas
        $('#canvas3d').show();
    } else {
        //view mode is 'Show both'
        $("#jpeg-label-canvas").show();
        $('#canvas3d').show();
        changeCanvasSize($("#canvas3d").width() / 2, $("#canvas3d").height() / 2);
    }

};

function download() {
    // download annotations
    var annotations = labelTool.createAnnotations();
    var outputString = '';
    for (var i = 0; i < annotations.length; i++) {
        outputString += annotations[i].label + " ";
        outputString += annotations[i].alpha + " ";
        outputString += annotations[i].occluded + " ";
        outputString += annotations[i].truncated + " ";
        outputString += annotations[i].left + " ";
        outputString += annotations[i].top + " ";
        outputString += annotations[i].right + " ";
        outputString += annotations[i].bottom + " ";
        outputString += annotations[i].height + " ";//length
        outputString += annotations[i].width + " ";//height
        outputString += annotations[i].length + " ";//width
        outputString += annotations[i].x + " ";//lateral x
        outputString += annotations[i].y + " ";
        outputString += annotations[i].z + " ";
        outputString += annotations[i].rotation_y + " ";
        outputString += annotations[i].score + " ";
        outputString += annotations[i].trackId + "\n";
    }
    outputString = b64EncodeUnicode(outputString);
    var fileName = labelTool.currentFileIndex.toString().padStart(6, '0');
    $($('#bounding-box-3d-menu ul li')[0]).children().first().attr('href', 'data:application/octet-stream;base64,' + outputString).attr('download', fileName + '.txt');
}

//change camera position to bird view position
function bird_view() {
    birdViewFlag = true;
    setCamera();
}

//change camera position to initial position
function camera_view() {
    birdViewFlag = false;
    setCamera();
}

//add new bounding box
annotationObjects.onAdd("PCD", function (index, cls, read_parameters) {
    var num = index;
    var bbox = read_parameters;//labelTool.getPCDBBox(num);
    labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].push(index.toString());
    var cubeGeometry = new THREE.CubeGeometry(1.0, 1.0, 1.0);//width, height, depth
    var color = classesBoundingBox.target().color;
    var cubeMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.1});
    var cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.set(bbox.x, -bbox.y, bbox.z);
    cubeMesh.scale.set(bbox.width, bbox.height, bbox.depth);
    cubeMesh.rotation.z = bbox.yaw;
    scene.add(cubeMesh);
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].push(cubeMesh);

    // var cubeAllEdgesMaterial = new THREE.MeshBasicMaterial({color: '#ff0000', wireframe: true});
    // var cubeAllEdges = new THREE.Mesh(cubeGeometry, cubeAllEdgesMaterial);
    // cubeAllEdges.position.set(bbox.x, -bbox.y, bbox.z);
    // cubeAllEdges.scale.set(bbox.width, bbox.height, bbox.depth);
    // cubeAllEdges.rotation.z = bbox.yaw;
    // scene.add(cubeAllEdges);
    // labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].push(cubeAllEdges);

    // var singleGeometry = new THREE.Geometry();

    // var cubeEdgeGeometry = new THREE.EdgesGeometry(cubeGeometry); // or WireframeGeometry( geometry )
    // var cubeHardEdgesMaterial = new THREE.LineBasicMaterial({color: color, linewidth: 2});
    // var cubeHardEdges = new THREE.LineSegments(cubeEdgeGeometry, cubeHardEdgesMaterial);
    // cubeHardEdges.updateMatrix();
    // singleGeometry.merge(cubeEdgeGeometry.geometry, cubeHardEdges.matrix);
    // cubeHardEdges.position.set(bbox.x, -bbox.y, bbox.z);
    // cubeHardEdges.scale.set(bbox.width, bbox.height, bbox.depth);
    // cubeHardEdges.rotation.z = bbox.yaw;
    // scene.add(cubeHardEdges);
    // labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].push(cubeHardEdges);

    // var cubeWireframeMaterial = new THREE.MeshBasicMaterial({color: color, wireframe: true});
    // var cubeLambertMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
    // var meshMaterials = [cubeLambertMaterial, cubeWireframeMaterial];
    // var cubeMesh = THREE.SceneUtils.createMultiMaterialObject(cubeGeometry, meshMaterials);

    // var cubeMaterial = new THREE.MeshBasicMaterial({color: '#ff0000', wireframe: false});
    // var cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // cubeMesh.position.set(bbox.x, -bbox.y, bbox.z);
    // cubeMesh.scale.set(bbox.width, bbox.height, bbox.depth);
    // cubeMesh.rotation.z = bbox.yaw;
    // cubeMesh.updateMatrix();
    // singleGeometry.merge(cubeMesh.geometry, cubeMesh.matrix);


    // var singleCubeMaterial = new THREE.MeshBasicMaterial({color: color, wireframe: false});
    // var mesh = new THREE.Mesh(singleGeometry, singleCubeMaterial);
    // scene.add(mesh);
    // labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].push(mesh);

    addBoundingBoxGui(bbox, num);
    return bbox;
});

//register new bounding box
function addBoundingBoxGui(bbox, num) {
    var index = boundingBox3DArray.length;
    var bb = guiOptions.addFolder('BoundingBox' + String(num));
    boundingBox3DArray.push(bb);
    var folder1 = boundingBox3DArray[index].addFolder('Position');
    var cubeX = folder1.add(bbox, 'x').min(-50).max(50).step(0.01).listen();
    var cubeY = folder1.add(bbox, 'y').min(-30).max(30).step(0.01).listen();
    var cubeZ = folder1.add(bbox, 'z').min(-3).max(10).step(0.01).listen();
    var cubeYaw = folder1.add(bbox, 'yaw').min(-Math.PI).max(Math.PI).step(0.05).listen();
    folder1.close();
    folder_position.push(folder1);
    var folder2 = boundingBox3DArray[index].addFolder('Size');
    var cubeW = folder2.add(bbox, 'width').min(0).max(10).step(0.01).listen();
    var cubeH = folder2.add(bbox, 'height').min(0).max(10).step(0.01).listen();
    var cubeD = folder2.add(bbox, 'depth').min(0).max(10).step(0.01).listen();
    folder2.close();
    folder_size.push(folder2);
    cubeX.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x = value;
    });
    cubeY.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y = -value;
    });
    cubeZ.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.z = value;
    });
    cubeYaw.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].rotation.z = value;
    });
    cubeW.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x + (value - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.x) * Math.cos(labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].rotation.z) / 2;
        bbox.x = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x;
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y + (value - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.x) * Math.sin(labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].rotation.z) / 2;
        bbox.y = -labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y;
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.x = value;
    });
    cubeH.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x + (value - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.y) * Math.sin(labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].rotation.z) / 2;
        bbox.x = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.x;
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y - (value - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.y) * Math.cos(labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].rotation.z) / 2;
        bbox.y = -labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.y;
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.y = value;
    });
    cubeD.onChange(function (value) {
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.z = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.z + (value - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.z) / 2;
        bbox.z = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].position.z;
        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].scale.z = value;
    });
    var reset_parameters = {
        reset: function () {
            resetCube(num, index);
        },
        delete: function () {
            guiOptions.removeFolder('BoundingBox' + String(num));
            labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][index].visible = false;
            annotationObjects.remove(num, "PCD");
            labelTool.changeFrame(labelTool.currentFileIndex)
            //annotationObjects.selectEmpty();
        }
    };

    //numbertagList.push(num);
    //labeltag = boundingBox3DArray[num].add( bbox, 'label' ,attribute).name("Attribute");
    boundingBox3DArray[boundingBox3DArray.length - 1].add(reset_parameters, 'reset').name("Reset");
    d = boundingBox3DArray[boundingBox3DArray.length - 1].add(reset_parameters, 'delete').name("Delete");
}

//reset cube patameter and position
function resetCube(index, num) {
    var reset_bbox = annotationObjects.get(index, "PCD");
    reset_bbox.x = reset_bbox.org.x;
    reset_bbox.y = reset_bbox.org.y;
    reset_bbox.z = reset_bbox.org.z;
    reset_bbox.yaw = reset_bbox.org.yaw;
    reset_bbox.width = reset_bbox.org.width;
    reset_bbox.height = reset_bbox.org.height;
    reset_bbox.depth = reset_bbox.org.depth;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].position.x = reset_bbox.x;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].position.y = -reset_bbox.y;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].position.z = reset_bbox.z;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].rotation.z = reset_bbox.yaw;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].scale.x = reset_bbox.width;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].scale.y = reset_bbox.height;
    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][num].scale.z = reset_bbox.depth;
}

//change window size
function onWindowResize() {
    // var canvas3D = $("canvas3d");
    // camera.aspect = canvas3D.getAttribute("width") / canvas3D.getAttribute("height");
    // camera.updateProjectionMatrix();
    // renderer.setSize(canvas3D.getAttribute("width"), canvas3D.getAttribute("height"));
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

//set camera type
function setCamera() {
    if (birdViewFlag == false) {
        camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 10000);
        camera.position.set(0, 0, 0.5);
        camera.up.set(0, 0, 1);
    } else {
        camera = new THREE.OrthographicCamera(-40, 40, 20, -20, 0, 2000);
        camera.position.set(0, 0, 450);
        camera.up.set(0, 0, 1);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
    scene.add(camera);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 0.3;
    controls.panSpeed = 0.2;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = false;// default: true
    controls.enableDamping = false;
    controls.dampingFactor = 0.3;
    controls.minDistance = 0.3;
    controls.maxDistance = 0.3 * 100;
    controls.noKey = true;
    controls.enabled = false;
    controls.target.set(1, 0, 0);
    controls.update();

}

//draw animation
function animate() {
    requestAnimationFrame(animate);
    keyboard.update();
    if (keyboard.down("shift")) {
        controls.enabled = true;
        bboxFlag = false;
    }

    if (keyboard.up("shift")) {
        controls.enabled = false;
        bboxFlag = true;
    }

    if (keyboard.down("alt")) {
        moveFlag = true;
    }
    if (keyboard.up("alt")) {
        moveFlag = false;
    }
    if (keyboard.down("C")) {
        rFlag = false;
        if (cFlag == false) {
            if (annotationObjects.exists(annotationObjects.getTargetIndex(), "PCD") == true) {
                copy_bbox_index = annotationObjects.getTargetIndex();
                copyBbox = annotationObjects.get(copy_bbox_index, "PCD");
                cFlag = true;
            }
        } else {
            copy_bbox_index = -1;
            cFlag = false;
        }
    }
    if (keyboard.down("R")) {
        cFlag = false;
        if (rFlag == false) {
            if (annotationObjects.exists(annotationObjects.getTargetIndex(), "PCD") == true) {
                rotation_bbox_index = annotationObjects.getTargetIndex();
                rFlag = true;
            }
        }
        else {
            rotation_bbox_index = -1;
            rFlag = false;
        }
    }

    controls.update();
    stats.update();
    if (annotationObjects.getTargetIndex() != rotation_bbox_index) {
        rFlag = false;
    }
    // var cubeLength;
    // var cubes = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex];
    // if (cubes == undefined) {
    //     cubeLength = 0;
    // } else {
    //     cubeLength = cubes.length;
    // }

    // for (var i = 0; i < labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].length; i++) {
    //     if (labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][i] == annotationObjects.getTargetIndex()) {
    //         boundingBox3DArray[i].open();
    //         folder_position[i].open();
    //         folder_size[i].open();
    //     }
    //     else {
    //         boundingBox3DArray[i].close();
    //     }
    //     if (i == labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].lastIndexOf(copy_bbox_index.toString()) && cFlag == true) {
    //         labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][i].material.color.setHex(0xffff00);
    //     }
    //     else if (boundingBox3DArray[i].closed == false) {
    //         if (i == labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].lastIndexOf(rotation_bbox_index.toString()) && rFlag == true) {
    //             labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][i].material.color.setHex(0xff8000);
    //         }
    //         else {
    //             labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][i].material.color.setHex(0xff0000);
    //             folder_position[i].open();
    //             folder_size[i].open();
    //         }
    //     }
    //
    //     else if (boundingBox3DArray[i].closed == true) {
    //         labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][i].material.color.setHex(0x008866);
    //     }
    // }
    renderer.render(scene, camera);
}

function init() {
    scene = new THREE.Scene();
    var axisHelper = new THREE.AxisHelper(0.1);
    axisHelper.position.set(0, 0, 0);
    scene.add(axisHelper);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0x161616);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    setCamera();

    var canvas3D = document.getElementById('canvas3d');
    canvas3D.appendChild(renderer.domElement);
    stats = new Stats();
    canvas3D.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    }, false);

    canvas3D.onmousedown = function (ev) {
        if (bboxFlag == true) {
            if (ev.target == renderer.domElement) {
                var rect = ev.target.getBoundingClientRect();
                mouseDown.x = ((ev.clientX - rect.left) / window.innerWidth) * 2 - 1;
                mouseDown.y = -((ev.clientY - rect.top) / window.innerHeight) * 2 + 1;
                if (birdViewFlag == false) {
                    var vector = new THREE.Vector3(mouseDown.x, mouseDown.y, 1);
                    vector.unproject(camera);
                    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
                } else {
                    var ray = new THREE.Raycaster();
                    var mouse = new THREE.Vector2();
                    mouse.x = mouseDown.x;
                    mouse.y = mouseDown.y;
                    ray.setFromCamera(mouse, camera);
                }
                var clickedObjects = ray.intersectObjects(labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex]);
                if (clickedObjects.length > 0) {
                    clickedObjectIndex = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex].indexOf(clickedObjects[0].object);
                    if (ev.button == 0) {
                        clickFlag = true;
                        clickedPoint = clickedObjects[0].point;
                        clickedCube = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex];
                        var material = new THREE.MeshBasicMaterial({
                            color: 0x000000,
                            wireframe: false,
                            transparent: true,
                            opacity: 0.0
                        });
                        var geometry = new THREE.PlaneGeometry(200, 200);
                        var clickedPlane = new THREE.Mesh(geometry, material);
                        clickedPlane.position.x = clickedPoint.x;
                        clickedPlane.position.y = clickedPoint.y;
                        clickedPlane.position.z = clickedPoint.z;
                        var normal = clickedObjects[0].face;
                        if ([normal.a, normal.b, normal.c].toString() == [6, 3, 2].toString() || [normal.a, normal.b, normal.c].toString() == [7, 6, 2].toString()) {
                            clickedPlane.rotation.x = Math.PI / 2;
                            clickedPlane.rotation.y = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z;
                        }
                        else if ([normal.a, normal.b, normal.c].toString() == [6, 7, 5].toString() || [normal.a, normal.b, normal.c].toString() == [4, 6, 5].toString()) {
                            clickedPlane.rotation.x = -Math.PI / 2;
                            clickedPlane.rotation.y = -Math.PI / 2 - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z;
                        }
                        else if ([normal.a, normal.b, normal.c].toString() == [0, 2, 1].toString() || [normal.a, normal.b, normal.c].toString() == [2, 3, 1].toString()) {
                            clickedPlane.rotation.x = Math.PI / 2;
                            clickedPlane.rotation.y = Math.PI / 2 + labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z;
                        }
                        else if ([normal.a, normal.b, normal.c].toString() == [5, 0, 1].toString() || [normal.a, normal.b, normal.c].toString() == [4, 5, 1].toString()) {
                            clickedPlane.rotation.x = -Math.PI / 2;
                            clickedPlane.rotation.y = -labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z;
                        }
                        else if ([normal.a, normal.b, normal.c].toString() == [3, 6, 4].toString() || [normal.a, normal.b, normal.c].toString() == [1, 3, 4].toString()) {
                            clickedPlane.rotation.y = -Math.PI
                        }
                        scene.add(clickedPlane);
                        clickedPlaneArray.push(clickedPlane);
                    }
                    else if (ev.button == 2) {
                        labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].visible = false;
                        var bboxIndex = labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex];
                        guiOptions.removeFolder('BoundingBox' + String(bboxIndex));
                        annotationObjects.remove(bboxIndex, "PCD");
                        labelTool.changeFrame(labelTool.currentFileIndex)
                    }
                } else if (birdViewFlag == true) {
                    clickedObjectIndex = -1;
                    groundPlaneArray = [];
                    var material = new THREE.MeshBasicMaterial({
                        color: 0x000000,
                        wireframe: false,
                        transparent: true,//default: true
                        opacity: 0.0//oefault 0.0
                    });
                    var geometry = new THREE.PlaneGeometry(200, 200);
                    var groundPlane = new THREE.Mesh(geometry, material);
                    groundPlane.position.x = 0;
                    groundPlane.position.y = 0;
                    groundPlane.position.z = -1;
                    groundPlaneArray.push(groundPlane);
                    var groundObject = ray.intersectObjects(groundPlaneArray);
                    groundClickedPoint = groundObject[0].point;
                }
            }
        }
    };

    canvas3D.onmouseup = function (ev) {
        if (ev.button == 0) {
            if (bboxFlag == true) {
                var rect = ev.target.getBoundingClientRect();
                mouseUp.x = ((ev.clientX - rect.left) / $("#canvas3d canvas").attr("width")) * 2 - 1;
                mouseUp.y = -((ev.clientY - rect.top) / $("#canvas3d canvas").attr("height")) * 2 + 1;
                if (birdViewFlag == false) {
                    var vector = new THREE.Vector3(mouseUp.x, mouseUp.y, 1);
                    vector.unproject(camera);
                    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
                } else {
                    var ray = new THREE.Raycaster();
                    var mouse = new THREE.Vector2();
                    mouse.x = mouseUp.x;
                    mouse.y = mouseUp.y;
                    ray.setFromCamera(mouse, camera);
                }
                var clickedObjects = ray.intersectObjects(clickedPlaneArray);
                if (clickedObjects.length > 0 && boundingBox3DArray[clickedObjectIndex].closed == false) {
                    var clickedBBox = annotationObjects.get(labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex], "PCD");
                    var dragVector = {
                        x: clickedObjects[0].point.x - clickedPoint.x,
                        y: clickedObjects[0].point.y - clickedPoint.y,
                        z: clickedObjects[0].point.z - clickedPoint.z
                    };
                    var yawDragVector = {
                        x: dragVector.x * Math.cos(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z) - dragVector.y * Math.sin(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z),
                        y: dragVector.x * Math.sin(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z) + dragVector.y * Math.cos(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z),
                        z: dragVector.z
                    };
                    var judgeClickPoint = {
                        x: (clickedPoint.x - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.x) * Math.cos(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z) - (clickedPoint.y - labelTool.cubeArray[clickedObjectIndex].position.y) * Math.sin(-labelTool.cubeArray[clickedObjectIndex].rotation.z),
                        y: (clickedPoint.x - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.x) * Math.sin(-labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z) + (clickedPoint.y - labelTool.cubeArray[clickedObjectIndex].position.y) * Math.cos(-labelTool.cubeArray[clickedObjectIndex].rotation.z)
                    };
                    if (moveFlag == true) {
                        clickedBBox.x = dragVector.x + clickedBBox.x;
                        clickedBBox.y = -dragVector.y + clickedBBox.y;
                        clickedBBox.z = dragVector.z + clickedBBox.z;
                    } else if (rFlag == true) {
                        clickedBBox.yaw = clickedBBox.yaw + Math.atan2(yawDragVector.y, yawDragVector.x) / (2 * Math.PI);
                    }
                    else {
                        clickedBBox.width = judgeClickPoint.x * yawDragVector.x / Math.abs(judgeClickPoint.x) + clickedBBox.width;
                        clickedBBox.x = dragVector.x / 2 + clickedBBox.x;
                        clickedBBox.height = judgeClickPoint.y * yawDragVector.y / Math.abs(judgeClickPoint.y) + clickedBBox.height;
                        clickedBBox.y = -dragVector.y / 2 + clickedBBox.y;
                        clickedBBox.depth = (clickedPoint.z - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.z) * dragVector.z / Math.abs((clickedPoint.z - labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.z)) + clickedBBox.depth;
                        clickedBBox.z = dragVector.z / 2 + clickedBBox.z;
                    }
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.x = clickedBBox.x;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.y = -clickedBBox.y;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].position.z = clickedBBox.z;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].rotation.z = clickedBBox.yaw;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].scale.x = clickedBBox.width;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].scale.y = clickedBBox.height;
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].scale.z = clickedBBox.depth;
                }

                if (clickedObjects.length > 0) {
                    for (var mesh in labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex]) {
                        var meshObject = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][mesh];
                        meshObject.material.opacity = 0.1;
                    }
                    labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex].material.opacity = 0.5;
                } else {
                    for (var mesh in labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex]) {
                        var meshObject = labelTool.cubeArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][mesh];
                        meshObject.material.opacity = 0.1;
                    }

                }
                if (clickFlag == true) {
                    clickedPlaneArray = [];
                    annotationObjects.select(labelTool.bboxIndexArray[labelTool.currentFileIndex][labelTool.currentCameraChannelIndex][clickedObjectIndex], "PCD");
                    clickFlag = false;
                } else if (groundPlaneArray.length == 1) {
                    var groundUpObject = ray.intersectObjects(groundPlaneArray);
                    var groundUpPoint = groundUpObject[0].point;
                    if (Math.abs(groundUpPoint.x - groundClickedPoint.x) > 0.1) {
                        var addBboxParameters = {
                            x: (groundUpPoint.x + groundClickedPoint.x) / 2,
                            y: -(groundUpPoint.y + groundClickedPoint.y) / 2,
                            z: -0.5,
                            width: Math.abs(groundUpPoint.x - groundClickedPoint.x),
                            height: Math.abs(groundUpPoint.y - groundClickedPoint.y),
                            depth: 1.0,
                            yaw: 0,
                            org: original = {
                                x: (groundUpPoint.x + groundClickedPoint.x) / 2,
                                y: -(groundUpPoint.y + groundClickedPoint.y) / 2,
                                z: -0.5,
                                width: Math.abs(groundUpPoint.x - groundClickedPoint.x),
                                height: Math.abs(groundUpPoint.y - groundClickedPoint.y),
                                depth: 1.0,
                                yaw: 0,
                            }
                        };
                        if (annotationObjects.exists(annotationObjects.getTargetIndex(), "PCD") == true) {
                            annotationObjects.selectEmpty();
                        }
                        var number = annotationObjects.getTargetIndex();
                        annotationObjects.setTarget("PCD", addBboxParameters);
                        annotationObjects.select(number, "PCD");
                    }
                    else if (cFlag == true) {
                        var addBboxParameters = {
                            x: (groundUpPoint.x + groundClickedPoint.x) / 2,
                            y: -(groundUpPoint.y + groundClickedPoint.y) / 2,
                            z: copyBbox.z,
                            width: copyBbox.width,
                            height: copyBbox.height,
                            depth: copyBbox.depth,
                            yaw: copyBbox.yaw,
                            org: original = {
                                x: (groundUpPoint.x + groundClickedPoint.x) / 2,
                                y: -(groundUpPoint.y + groundClickedPoint.y) / 2,
                                z: copyBbox.z,
                                width: copyBbox.width,
                                height: copyBbox.height,
                                depth: copyBbox.depth,
                                yaw: copyBbox.yaw,
                            }
                        };
                        if (annotationObjects.exists(annotationObjects.getTargetIndex(), "PCD") == true) {
                            annotationObjects.selectEmpty();
                        }
                        let number = annotationObjects.getTargetIndex();
                        annotationObjects.setTarget("PCD", addBboxParameters);
                        annotationObjects.select(number, "PCD");
                    }

                    groundPlaneArray = [];
                    $("#label-tool-log").val("4. Choose class from drop down list");
                    $("#label-tool-log").css("color", "#969696");
                }

            }
            if (clickedObjectIndex == -1) {
                annotationObjects.selectEmpty();
            }
        }
    };
    labelTool.cubeArray = [];
    labelTool.bboxIndexArray = [];
    labelTool.savedFrames = [];
    for (var i = 0; i < 3962; i++) {
        labelTool.cubeArray.push([]);
        labelTool.bboxIndexArray.push([]);
        labelTool.savedFrames.push([]);
        for (var j = 0; j < 6; j++) {
            labelTool.cubeArray[i].push([]);
            labelTool.bboxIndexArray[i].push([]);
            labelTool.savedFrames[i].push(false);
        }
    }

    guiBoundingBoxAnnotationMap = {
        "Vehicle": guiAnnotationClasses.add(parametersBoundingBox, "Vehicle").name("Vehicle"),
        "Truck": guiAnnotationClasses.add(parametersBoundingBox, "Truck").name("Truck"),
        "Motorcycle": guiAnnotationClasses.add(parametersBoundingBox, "Motorcycle").name("Motorcycle"),
        "Bicycle": guiAnnotationClasses.add(parametersBoundingBox, "Bicycle").name("Bicycle"),
        "Pedestrian": guiAnnotationClasses.add(parametersBoundingBox, "Pedestrian").name("Pedestrian"),
    };

    guiAnnotationClasses.domElement.id = 'class-picker';
    $('#class-picker ul li').css('background-color', '#353535');
    $($('#class-picker ul li')[0]).css('background-color', '#525252');
    $('#class-picker ul li').css('border-bottom', '0px');

    // 3D BB controls
    guiOptions.add(parameters, 'download').name("Download");
    var viewMode = guiOptions.add(parameters, 'view_mode', ['Image', 'Point cloud', 'Image and point cloud']).name('View mode').listen();
    viewMode.onChange(function (value) {
        parameters.view_mode = value;
        changeViewMode(value);
    });
    guiOptions.add(parameters, 'bird_view').name("Birds-Eye-View");
    // guiOptions.add(parameters, 'camera_view').name("Camera View");
    readYAMLFile(labelTool.workBlob + "/calibration.yml");
    data_load(parameters);
    guiOptions.domElement.id = 'bounding-box-3d-menu';
    $('#bounding-box-3d-menu').css('width', '290px');
    $('#bounding-box-3d-menu ul li').css('background-color', '#353535');
    // add download Annotations button
    var downloadAnnotationsItem = $($('#bounding-box-3d-menu ul li')[0]);
    var downloadAnnotationsDivItem = downloadAnnotationsItem.children().first();
    downloadAnnotationsDivItem.wrap("<a href=\"\"></a>");

    guiOptions.open();
    var liItems = $("#class-picker ul li");
    liItems.each(function (i, item) {
        var propNamesArray = Object.getOwnPropertyNames(classesBoundingBox);
        var color = classesBoundingBox[propNamesArray[i]].color;
        var attribute = "20px solid" + ' ' + color;
        $(item).css("border-left", attribute);
        $(item).css('border-bottom', '0px');
    });

    $("#label-tool-log").val("1. Draw bounding box ");
    $("#label-tool-log").css("color", "#969696");
}
