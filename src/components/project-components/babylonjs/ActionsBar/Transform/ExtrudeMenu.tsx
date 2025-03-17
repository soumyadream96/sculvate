import * as React from "react";
import { useState, useEffect } from "react";
import * as BABYLON from "babylonjs";
// import { GizmoManager, Vector3 } from "babylonjs";
import {
    Model,
    setFirstSelected,
    selectModels,
    selectFirstSelected,
    modelAltered,
    modelAdded,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { MaterialSelectOptions } from "components/project-components/MaterialSelectOptions";
import { useAppSelector, useAppDispatch } from "state/hooks";
import DraggableModal from "components/DraggableModal";
import { pickQuads, computeNormal, pickMesh } from "utilities";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { selectMaterials } from "state/reducers/userSlice";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";
import { useParams } from "react-router-dom";

export interface ExtrudeProps {
    visible: boolean;
    setVisible: (value: boolean) => void;
    mainScene: BABYLON.Scene | any;
}

function ExtrudeMenu({ visible, setVisible, mainScene }: ExtrudeProps) {
    const [sel, setSel] = useState(false);
    const [name, setName] = useState("");
    const [heightExt, setHeightExt] = useState("");
    const [material, setMaterial] = useState("PEC");
    const materials = useAppSelector(selectMaterials);
    const [selectedModels, setSelectedModels] = useState<Model[]>([]);
    const [selectedFace, setSelectedFace] = useState<any>(undefined);

    const models = useAppSelector(selectModels);
    const refresh = useAppSelector(selectRefresh);
    const modelsToDraw = Object.values(models);
    const arrayModel = modelsToDraw.flat();
    const dispatch = useAppDispatch();
    const firstSelected: any = useAppSelector(selectFirstSelected);
    const parameters = useAppSelector(selectParameters);
    const username = useAppSelector(selectUsername);
    const { projectId } = useParams<{ projectId: string }>();
    const [isValid, setIsValid] = useState(true);
    const handleName = (e: any) => {
        setName(e.target.value);
    }

    const handleHeightExt = (e: any) => {
        setHeightExt(e.target.value);
    }

    const handleChanges = (e: any) => {
        switch (e.target.name) {
            case "name":
                setName(e.target.value);
                break;
            case "height":
                setHeightExt(e.target.value);
                break;
            case "material":
                setMaterial(e.target.value);
                break;
            default:
                break;
        }
    }

    const [observer, setObserver] = useState(undefined);
    let previouslyColoredMesh: BABYLON.Mesh | null = null;
    const [color,setColor]=useState<BABYLON.Mesh | null>(null);
    useEffect(() => {
        if (sel === false) {
            // mainScene.onPointerObservable.remove();
        } else {
            const pickFace = () => {
                let selected: any;
                 // Track the previously colored mesh    
                const ob = mainScene.onPointerObservable.add((e: any) => {
                    if (sel) {
                        if (e.type === BABYLON.PointerEventTypes.POINTERDOWN && e.pickInfo.hit) {
                            console.log(sel);
                            if (selected?.shape) selected?.shape?.dispose();
                            let firstSelectedModel: any = models.find((model) => model.id === firstSelected);
                            let tess = 0;
                            console.log(firstSelectedModel)
                            console.log(e)
                            if (firstSelectedModel.type !== "extrudedMesh") {
                                if (e.pickInfo.pickedMesh.name !== "Cylinder") {
                                    console.log("ee")
                                    setSelectedFace(null);
                                }
                                else {
                                    tess = firstSelectedModel.object.tessellation;
                                    let pickResult = mainScene.pick(mainScene.pointerX, mainScene.pointerY);
                                    selected = pickQuads(pickResult, e.pickInfo, tess, mainScene);
                                    setSelectedFace(selected);
                                    console.log("selectedFace:", selected);
                                    if (previouslyColoredMesh) {
                                        previouslyColoredMesh.dispose();
                                        previouslyColoredMesh = null;
                                    }
                                    if (e.pickInfo.pickedMesh.name == "Cylinder") {
                                        if (firstSelectedModel.object.tessellation !== undefined && selected.positions.length === 4) {
                                            console.log("aa")
                                            // Create the plane mesh
                                            const points: BABYLON.Vector3[] = [
                                                new BABYLON.Vector3(selected.positions[0].x, selected.positions[0].y, selected.positions[0].z),
                                                new BABYLON.Vector3(selected.positions[2].x, selected.positions[2].y, selected.positions[2].z),
                                                new BABYLON.Vector3(selected.positions[3].x, selected.positions[3].y, selected.positions[3].z),
                                                new BABYLON.Vector3(selected.positions[1].x, selected.positions[1].y, selected.positions[1].z),
                                            ];
                                            console.log(selectedFace)
                                            selected.shape.name = "cylinderside";
                                            let a = {
                                                positions: points, shape: selected.shape,
                                            }
                                            setSelectedFace(a);
                                            console.log("selectedFace:", a);
                                            const planeMesh = new BABYLON.Mesh("customPlane", mainScene);
                                            const vertexData = new BABYLON.VertexData();
                                            vertexData.positions = points.flatMap((point: any) => [point.x, point.y, point.z]);
                                            vertexData.indices = [0, 1, 2, 0, 2, 3];
                                            vertexData.applyToMesh(planeMesh);

                                            // Create a red material
                                            const redMaterial = new BABYLON.StandardMaterial("redMaterial", mainScene);
                                            redMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
                                            redMaterial.alpha = 1;
                                            // Apply the red material to the plane mesh
                                            planeMesh.material = redMaterial;
                                            // Update the previously colored mesh
                                            previouslyColoredMesh = planeMesh;
                                            console.log(previouslyColoredMesh)
                                            setColor(previouslyColoredMesh);
                                        }
                                    }
                                }


                            }
                            else {
                                console.log(firstSelectedModel)
                                if (firstSelectedModel.object.bottomDiameter != undefined) {//This is extruded from cylinder.
                                    let pickResult = mainScene.pick(mainScene.pointerX, mainScene.pointerY);
                                    const s = pickMesh(pickResult, firstSelectedModel)
                                    let selected = {
                                        positions: s.plan
                                    }
                                    if (previouslyColoredMesh) {
                                        previouslyColoredMesh.dispose();
                                        previouslyColoredMesh = null;
                                    }
                                    if (s.pos == "cap") {
                                        setSelectedFace(selected.positions);
                                        let points: any = [];
                                        selected.positions.map((a: any) => {
                                            points.push(new BABYLON.Vector3(a.x, a.y + parseFloat(firstSelectedModel.height), a.z));
                                        });

                                        // Create a path from the points
                                        var path = [];
                                        for (var i = 0; i < points.length; i++) {
                                            path.push(points[points.length-i-1]);
                                        }

                                        // Create a material with red color
                                        var redMaterial = new BABYLON.StandardMaterial("redMaterial", mainScene);
                                        redMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Set the diffuse color to red
                                        redMaterial.alpha = 1;
                                        // Create the ribbon mesh
                                        var polygon = BABYLON.MeshBuilder.CreateRibbon("polygon", { pathArray: [path], closeArray: true }, mainScene);
                                        // Assign the red material to the ribbon mesh
                                        polygon.material = redMaterial;
                                        previouslyColoredMesh = polygon;
                                        setColor(previouslyColoredMesh);
                                    }
                                    else {
                                        setSelectedFace(selected);
                                        console.log("selectedFace:", selected);
                                        const planeMesh = new BABYLON.Mesh("customPlane", mainScene);
                                        const vertexData = new BABYLON.VertexData();
                                        const points: BABYLON.Vector3[] = [
                                            new BABYLON.Vector3(selected.positions[3].x, selected.positions[3].y, selected.positions[3].z),
                                            new BABYLON.Vector3(selected.positions[2].x, selected.positions[2].y, selected.positions[2].z),
                                            new BABYLON.Vector3(selected.positions[1].x, selected.positions[1].y, selected.positions[1].z),
                                            new BABYLON.Vector3(selected.positions[0].x, selected.positions[0].y, selected.positions[0].z),
                                        ];
                                        vertexData.positions = points.flatMap((point: any) => [point.x, point.y, point.z]);
                                        vertexData.indices = [0, 1, 2, 0, 2, 3];
                                        vertexData.applyToMesh(planeMesh);

                                        // Create a red material
                                        const redMaterial = new BABYLON.StandardMaterial("redMaterial", mainScene);
                                        redMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
                                        redMaterial.alpha = 1;
                                        // Apply the red material to the plane mesh
                                        planeMesh.material = redMaterial;

                                        // Update the previously colored mesh
                                        previouslyColoredMesh = planeMesh;
                                        setColor(previouslyColoredMesh);

                                    }
                                }
                                else {//This is extruded from cube

                                }
                            }
                        }
                    }
                    else {
                        console.log(sel);
                        if (previouslyColoredMesh) {
                            previouslyColoredMesh.dispose();
                            previouslyColoredMesh = null;
                        }
                    }
                });
                setObserver(ob);
            };
            pickFace();
        }
    }, [sel]);


    const handleOk = async () => {
        let firstSelectedModel: any = models.find((model) => model.id === firstSelected);
        console.log(firstSelectedModel.object, heightExt);
        if (selectedFace) {
            console.log(selectedFace.shape);
            let mdl = {
                id: uuid(),
                name: name,
                height: heightExt,
                type: "extrudedMesh",
                material: material,
                object: firstSelectedModel.object,
                status: "Added",
                category: "Objects",
                parentId: 0,
                visible: true,
                selected: false,
                isEditProperty: false,
                selectedFacePoints: [{}],
                selectedFaceScaling: {
                    x: selectedFace.shape.scaling.x,
                    y: selectedFace.shape.scaling.y,
                    z: selectedFace.shape.scaling.z,
                },
                offsetPosition: {
                    x: firstSelectedModel.object.xMin,
                    y: firstSelectedModel.object.yMin,
                    z: firstSelectedModel.object.zMin,
                },
                position: {
                    x: selectedFace.shape.absolutePosition.x,
                    y: selectedFace.shape.absolutePosition.y,
                    z: selectedFace.shape.absolutePosition.z,
                },
                rotation: {
                    x: selectedFace.shape.rotation.x,
                    y: selectedFace.shape.rotation.y,
                    z: selectedFace.shape.rotation.z,
                },
                scaling: {
                    x: selectedFace.shape.scaling.x,
                    y: selectedFace.shape.scaling.y,
                    z: selectedFace.shape.scaling.z,
                },
                diameter: firstSelectedModel.object.diameter,
                topDiameter: firstSelectedModel.object.topDiameter,
                bottomDiameter: firstSelectedModel.object.bottomDiameter,
                tessellation: firstSelectedModel.object.tessellation,
                subdivisions: firstSelectedModel.object.subdivisions
            };
            console.log(mdl);
            selectedFace.positions.map((pos: any, index: number) => {
                mdl.selectedFacePoints[index] = { x: pos.x, y: pos.y, z: pos.z };
            })
            dispatch(modelAdded(mdl));
            await dispatch(addHistory({
                payloadData: {
                    extrude: {
                        name: name,
                        id: mdl.id,
                        height: mdl.height,
                        selectedFacePoints: mdl.selectedFacePoints,
                        selectedFaceScaling: mdl.selectedFaceScaling,
                        offsetPosition: mdl.offsetPosition,
                        material: material,
                        parentId: mdl.parentId,
                        diameter: mdl.diameter,
                        topDiameter: mdl.topDiameter,
                        bottomDiameter: mdl.bottomDiameter,
                        tessellation: mdl.tessellation,
                        subdivisions: mdl.subdivisions,
                        position: mdl.position,
                        scaling: mdl.scaling,
                        rotation: mdl.rotation,
                        object: mdl.object
                    },
                },
                currentUsername: username,
                projectId: projectId || "",
            }))
        }
        setVisible(false);

        // Assuming you have 4 points (p1, p2, p3, p4) that lie on the same plane
        // Create a custom mesh using the 4 points
        var customMesh = new BABYLON.Mesh("customMesh", mainScene);
        var vertexData = new BABYLON.VertexData();

        // Define the positions of the 4 points
        var positions = [
            selectedFace.positions[0].x, selectedFace.positions[0].y, selectedFace.positions[0].z,
            selectedFace.positions[1].x, selectedFace.positions[1].y, selectedFace.positions[1].z,
            selectedFace.positions[2].x, selectedFace.positions[2].y, selectedFace.positions[2].z,
            selectedFace.positions[3].x, selectedFace.positions[3].y, selectedFace.positions[3].z
        ];

        // Define the indices to create the faces
        var indices = [0, 1, 2, 0, 2, 3];

        // Apply the positions and indices to the vertex data
        vertexData.positions = positions;
        vertexData.indices = indices;

        // Apply the vertex data to the custom mesh
        vertexData.applyToMesh(customMesh);

        // Create a new material with a different color (e.g., white)
        var newMaterial = new BABYLON.StandardMaterial("newMaterial", mainScene);
        newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // Set the diffuse color to white

        // Apply the new material to the custom mesh
        customMesh.material = newMaterial;
        console.log(selectedFace);

    }

    const handleCancel = () => {
        if (previouslyColoredMesh) {
            previouslyColoredMesh.dispose();
            previouslyColoredMesh = null;
        }
        setVisible(false);
        if (observer) {
            mainScene.onPointerObservable.remove(observer);
        }
        console.log(firstSelected)
        let firstSelectedModel: any = models.find((model) => model.id === firstSelected);
        console.log(firstSelectedModel);
        if(selectedFace?.positions?.length!==undefined){
            console.log(materials[firstSelectedModel.material]?.color)
            const vertexData = new BABYLON.VertexData();
            const points: BABYLON.Vector3[] = [
                new BABYLON.Vector3(selectedFace.positions[3].x, selectedFace.positions[3].y, selectedFace.positions[3].z),
                new BABYLON.Vector3(selectedFace.positions[2].x, selectedFace.positions[2].y, selectedFace.positions[2].z),
                new BABYLON.Vector3(selectedFace.positions[1].x, selectedFace.positions[1].y, selectedFace.positions[1].z),
                new BABYLON.Vector3(selectedFace.positions[0].x, selectedFace.positions[0].y, selectedFace.positions[0].z),
            ];
            vertexData.positions = points.flatMap((point: any) => [point.x, point.y, point.z]);
            vertexData.indices = [0, 1, 2, 0, 2, 3];
            const planeMesh = new BABYLON.Mesh("customPlane", mainScene);
            vertexData.applyToMesh(planeMesh);
            const redMaterial =  new BABYLON.StandardMaterial("redMaterial", mainScene);;
            redMaterial.diffuseColor = BABYLON.Color3.FromHexString(
                materials[firstSelectedModel.material]?.color
              );
            redMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            redMaterial.alpha = 1;
            console.log(redMaterial)
            planeMesh.material = redMaterial;
        }
        else{
            
            console.log("eeee",materials["PEC"]?.color)
            let points: any = [];
            selectedFace.map((a: any) => {
                points.push(new BABYLON.Vector3(a.x, a.y + parseFloat(firstSelectedModel.height), a.z));
            });

            // Create a path from the points
            var path = [];
            for (var i = 3; i < points.length; i++) {
                path.push(points[i]);
            }           
            // Create the ribbon mesh
            console.log(path);
            var polygon = BABYLON.MeshBuilder.CreateRibbon("polygon", { pathArray: path, closeArray: true }, mainScene);
            

            const redMaterial =  new BABYLON.StandardMaterial("redMaterial", mainScene);;
            redMaterial.diffuseColor = BABYLON.Color3.FromHexString(
                materials[firstSelectedModel.material]?.color
              );
            redMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            redMaterial.alpha = 1;
            polygon.material = redMaterial;
        }
        
    }

    return (
        <DraggableModal
            title={
                <div className="pointer-events-auto cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
                    Extrude
                </div>
            }
            visible={visible}
            buttons={
                <div className="flex flex-row gap-1 justify-center">
                    <button
                        onClick={() => {
                            console.log(sel);

                            handleOk();
                            setSel(false);
                        }}
                        id="translate-ok-btn"
                        disabled={!isValid}
                        className={`rounded text-center px-4 py-1 disable-drag ${isValid
                            ? "bg-green-300 hover:bg-green-400 active:bg-green-500"
                            : "bg-[#D9D9D9]"
                            }`}
                    >
                        OK
                    </button>
                    <button
                        onClick={() => {
                            handleCancel();
                            setSel(false);
                        }}
                        id="translate-cancel-btn"
                        className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
                    >
                        Cancel
                    </button>
                </div>
            }
        >
            <form>
                <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-3">
                    <div className="col-span-full">
                        <div className="flex rounded-md sm:max-w-lg ring-1 ring-inset disable-drag">
                            <button
                                className={`block flex-1 py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md sm:max-w-lg ring-1 ring-inset ring-primary-600
                                bg-teal-400 hover:bg-teal-500 active:bg-teal-600 hover:transition duration-150"
                                    }`}
                                onClick={() => {
                                    setSel(true);
                                }}
                                // disabled={}
                                type="button"
                            >
                                Pick face
                            </button>
                        </div>
                    </div>
                    <div className="col-span-full">
                        <label
                            htmlFor="name"
                            className="flex text-sm font-large leading-6 text-gray-900 mr-2"
                        >
                            Name
                        </label>
                        <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                            <input
                                type="text"
                                name="name"
                                value={name}
                                onChange={handleName}
                                id="name"
                                autoComplete="off"
                                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                            />
                        </div>
                    </div>
                    <div className="col-span-full">
                        <label
                            htmlFor="height"
                            className="block text-sm font-medium leading-6 text-gray-900 mr-2"
                        >
                            Height
                        </label>
                        <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                            <input
                                type="text"
                                name="height"
                                value={heightExt}
                                onChange={handleHeightExt}
                                id="height"
                                autoComplete="off"
                                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                            />
                        </div>
                    </div>
                    <div className="col-span-full ">
                        <label
                            htmlFor="material"
                            className="block text-sm font-medium leading-6 text-gray-900"
                        >
                            Material
                        </label>
                        <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                            <select
                                name="material"
                                id="material"
                                value={material}
                                onChange={handleChanges}
                                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                            >
                                <MaterialSelectOptions options={materials ?? {}} />
                            </select>
                        </div>
                    </div>
                </div>
            </form>
        </DraggableModal>
    );
}

export default ExtrudeMenu;
