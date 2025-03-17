// import { Storage } from "aws-amplify";
// import { VertexBuffer } from "babylonjs/Meshes/buffer";

const stringMath = require("string-math");

export const parseToken = (token: string) => {
  if (token !== "") {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => {
          const base = `00${c.charCodeAt(0).toString(16)}`;
          return `%${base.slice(-2)}`;
        })
        .join("")
    );
    return JSON.parse(payload);
  }
  return "";
};

export const isExpiredToken = (tokenData: any) => {
  if (Math.floor(Date.now() / 1000) >= tokenData.exp) {
    return true;
  }
  return false;
};

interface Parameter {
  id: string;
  name: string;
  expression: string;
  value: string;
  description: string;
}
export const isParameter = (val: string, parameters: Array<Parameter>) => {
  let flag: boolean = false;
  parameters.forEach((parameter) => {
    if (parameter.name === val) flag = true;
  });

  if (flag) return true;
  flag = true;
  for (let i = 0; i < val.length; i++) {
    if (
      !(
        val[i] === "+" ||
        val[i] === "-" ||
        val[i] === "*" ||
        val[i] === "/" ||
        val[i] === "(" ||
        val[i] === ")" ||
        val[i] === "^" ||
        val[i] === "%" ||
        val[i] === "." ||
        (val[i] >= "0" && val[i] <= "9")
      )
    ) {
      return false;
    }
  }
  return flag;
};

export const replaceParameterToValue = (val: string, param: string, value: string) => {
  let str = val.toString().replace(/\s/g, "");

  str = str.replaceAll(param, value);
  return str;
}

export const replaceParametersToIds = (val: string, params: Array<Parameter>) => {
  let str = val.toString().replace(/\s/g, "");

  // const breakPoint = /\+|\-|\*|\/|\(|\)|\^|\%/;
  const breakPoint = /[+\-*/()^%]/;
  let mathmaticalSymbols: Array<string> = [];
  for (let i = 0; i < str.length; i++) {
    if (
      str[i] === "+" ||
      str[i] === "-" ||
      str[i] === "*" ||
      str[i] === "/" ||
      str[i] === "(" ||
      str[i] === ")" ||
      str[i] === "^" ||
      str[i] === "%"
    )
      mathmaticalSymbols.push(str[i]);
  }
  const words = str.toString().split(breakPoint);
  let resString: string = "";
  words.forEach((word: string, index: number) => {
    let cnt = 0;
    params.forEach((param: Parameter) => {
      if (word === param.name) {
        resString += param.id.toString();
        return;
      }
      cnt++;
    })
    if (cnt === params.length) resString += word;
    if (mathmaticalSymbols[index])
      resString += mathmaticalSymbols[index];
  });
  return resString;
}

export const replaceIdsToParameters = (val: string, params: Array<Parameter>) => {
  let str = val.toString().replace(/\s/g, "");

  params.forEach((param: Parameter) => {
    str = str.replaceAll(param.id.toString(), param.name.toString());
  });
  return str;
}

export const calculate = (val: string, parameters: Array<Parameter>) => {
  let str = val.toString().replace(/\s/g, "");
  parameters.forEach((param: Parameter) => {
    str = str.replaceAll(param.id.toString(), param.expression.toString());
  });

  if (str === "") return NaN;
  try {
    let resVal = stringMath(str);
    return resVal;
  } catch (e) {
    return NaN;
  }
};

const isEdge = (pos1: any, pos2: any) => {
  let cnt = 0;
  if (pos1.x === pos2.x) cnt++;
  if (pos1.y === pos2.y) cnt++;
  if (pos1.z === pos2.z) cnt++;
  if (cnt === 2) return true;
  return false;
}

export const getVertices = (mesh: any) => {
  if (!mesh) {
    return;
  }
  var piv = mesh.getPivotPoint();
  var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions) {
    return;
  }
  var numberOfPoints = positions.length / 3;

  // var level = false;
  var map = [];
  var poLoc = [];
  var poGlob = [];
  for (var i = 0; i < numberOfPoints; i++) {
    var p = new BABYLON.Vector3(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2]
    );
    var found = false;
    for (var index = 0; index < map.length && !found; index++) {
      var array: any = map[index];
      var p0 = array[0];
      if (p0.equals(p) || p0.subtract(p).lengthSquared() < 0.00001) {
        found = true;
      }
    }
    if (!found) {
      var array2: any = [];
      poLoc.push(p.subtract(piv));
      poGlob.push(
        BABYLON.Vector3.TransformCoordinates(p, mesh.getWorldMatrix())
      );
      array2.push(p);
      map.push(array2);
    }
  }
  let tPoGlob: any = [];
  let tPoLoc: any = [];
  for (let i = 0; i < poGlob.length; i++) {
    for (let j = i + 1; j < poGlob.length; j++) {
      if (isEdge(poGlob[i], poGlob[j])) {
        let p1 = new BABYLON.Vector3((poGlob[i].x + poGlob[j].x) / 2, (poGlob[i].y + poGlob[j].y) / 2, (poGlob[i].z + poGlob[j].z) / 2);
        let p2 = new BABYLON.Vector3((poLoc[i].x + poLoc[j].x) / 2, (poLoc[i].y + poLoc[j].y) / 2, (poLoc[i].z + poLoc[j].z) / 2);
        tPoGlob.push(p1);
        tPoLoc.push(p2);
      }
    }
  }
  for (let i = 0; i < tPoGlob.length; i++) {
    poGlob.push(tPoGlob[i]);
    poLoc.push(tPoLoc[i]);
  }
  return { local: poLoc, global: poGlob, pivot: piv };
};

export const round = (val: any) => {
  return Math.round(val * 1e5) / 1e5;
};

export const wait = (miliSecs: any) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, miliSecs);
  });
};

export const centralPos = (models: any, mainScene: any) => {
  let pos = new BABYLON.Vector3(0, 0, 0);
  models.forEach((model: any) => {
    pos.x += mainScene.getMeshById(model.id)?.absolutePosition.x;
    pos.y += mainScene.getMeshById(model.id)?.absolutePosition.y;
    pos.z += mainScene.getMeshById(model.id)?.absolutePosition.z;
  });
  pos.x = round(pos.x / models.length);
  pos.y = round(pos.y / models.length);
  pos.z = round(pos.z / models.length);
  return pos;
}
export const pickMesh=(pos:any,shape:any)=>{
  let sortedpoints: any = [];
  console.log(shape)
  sortedpoints.push(shape.selectedFacePoints[2]);
  sortedpoints.push(shape.selectedFacePoints[1]);
  for(let i=3;i<shape.selectedFacePoints.length-1;i++){
    sortedpoints.push(shape.selectedFacePoints[i]);
  }
  console.log(sortedpoints);
  let centpos:any=[];
  for(let j=0;j<sortedpoints.length-1;j++){
    centpos.push(new BABYLON.Vector3((sortedpoints[j].x+sortedpoints[j+1].x)/2,(sortedpoints[j].y+sortedpoints[j+1].y)/2,(sortedpoints[j].z+sortedpoints[j+1].z)/2));
  }
  centpos.push(new BABYLON.Vector3((sortedpoints[sortedpoints.length-1].x+sortedpoints[0].x)/2,(sortedpoints[sortedpoints.length-1].y+sortedpoints[0].y)/2,(sortedpoints[sortedpoints.length-1].z+sortedpoints[0].z)/2));
  let dis:any=[];
  const center = new BABYLON.Vector3(pos.pickedPoint.x, pos.pickedPoint.y, pos.pickedPoint.z);
  for(let j=0;j<centpos.length;j++){
    dis.push(BABYLON.Vector3.Distance(centpos[j], center));
  }
  const cap = new BABYLON.Vector3(shape.selectedFacePoints[0].x, shape.selectedFacePoints[0].y, shape.selectedFacePoints[0].z);
  let top=BABYLON.Vector3.Distance(cap,center);
  console.log(cap)
  let minValue = dis[0]; // Initialize the minimum value with the first element of the array
  let minIndex = 0;
  for (let i = 1; i < dis.length; i++) {
      if (dis[i] < minValue) {
          minValue = dis[i]; // Update the minimum value
          minIndex = i; // Update the index of the minimum value
      }
    }
  console.log(minIndex);
  if(top<dis[minIndex]){
    let plane:any=[];
    console.log(sortedpoints)
    sortedpoints.forEach((i:any)=>{
      plane.push(new BABYLON.Vector3(i.x,i.y,i.z));
    })
    let tmp=sortedpoints[1];
    sortedpoints[1]=sortedpoints[2];
    sortedpoints[2]=tmp;
    console.log(sortedpoints)
    let a={plan:shape.selectedFacePoints,pos:"cap"}
    return a;
  }
  else{
    console.log(dis,top);
    
    let arrow=-1;
    if(shape.selectedFacePoints[0].y>0){
      arrow=1
    }
    let plane:any=[];
    if(minIndex===(sortedpoints.length-1)){
      console.log(sortedpoints[minIndex],sortedpoints[0],new BABYLON.Vector3(sortedpoints[0].x,sortedpoints[0].y+arrow*shape.height,sortedpoints[0].z),new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y+arrow*shape.height,sortedpoints[minIndex].z)); 
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y,sortedpoints[minIndex].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[0].x,sortedpoints[0].y,sortedpoints[0].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[0].x,sortedpoints[0].y+arrow*shape.height,sortedpoints[0].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y+arrow*shape.height,sortedpoints[minIndex].z))   
    }
    else{
      console.log(sortedpoints[minIndex],sortedpoints[minIndex+1],new BABYLON.Vector3(sortedpoints[minIndex+1].x,sortedpoints[minIndex+1].y+arrow*shape.height,sortedpoints[minIndex+1].z),new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y+arrow*shape.height,sortedpoints[minIndex].z));    
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y,sortedpoints[minIndex].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex+1].x,sortedpoints[minIndex+1].y,sortedpoints[minIndex+1].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex+1].x,sortedpoints[minIndex+1].y+arrow*shape.height,sortedpoints[minIndex+1].z))   
      plane.push(new BABYLON.Vector3(sortedpoints[minIndex].x,sortedpoints[minIndex].y+arrow*shape.height,sortedpoints[minIndex].z))   
    }
    let a={plan:plane,pos:"side"}
    return a;
  }
  
}
export const pickQuads = (pos:any,pickInfo: any, tess:any,scene: any) => {
  let { pickedMesh, faceId } = pickInfo
  let indices = pickedMesh.getIndices()
  console.log(indices)
  let faceSet: any = new Set();
  indices.forEach((e: any, index: any) => {
    if (e === indices[faceId * 3] || e === indices[faceId * 3 + 1] || e === indices[faceId * 3 + 2]) {
      faceSet.add(Math.floor(index / 3))
    }
  })
  return createPickFaceMesh([...faceSet.values()], pickedMesh, scene, faceId,pos,tess)
}

function createPickFaceMesh(faces: any, pickedMesh: any, scene: any, faceId: any,pos:any,tess:any) {
  let newIndices: any = []
  let indices = pickedMesh.getIndices();
  faces.forEach((e: any) => {
      newIndices.push(indices[e * 3], indices[e * 3 + 1], indices[e * 3 + 2],)
  })
  if(tess!==0){

  }
  if (pickedMesh instanceof BABYLON.Mesh) {
      let clone = pickedMesh.clone()
      let geo: any = pickedMesh.geometry?.copy(scene.getUniqueId())
      geo.setIndices(newIndices)
      geo.applyToMesh(clone)
      // clone.renderOverlay = true
      clone.isPickable = false
      let positionData: any = clone.getPositionData();
      let indexes: number[] = [];
      let resultPositions: any = [];
      newIndices.forEach((indice: number) => {
        let isDuplicatedIndex = false;
        indexes.forEach((index: number) => {
          if (indice === index) {
            isDuplicatedIndex = true;
            return; // Optional: Exit early if a duplicate is found
          }
        });
        if (!isDuplicatedIndex) {
          resultPositions.push(new BABYLON.Vector3(positionData[3 * indice], positionData[3 * indice + 1], positionData[3 * indice + 2]));
          indexes.push(indice);
        }
      })
      var planes=dividePointsByPlanes(newIndices,tess);
      const distances: number[] = [];
      const center = new BABYLON.Vector3(pos.pickedPoint.x, pos.pickedPoint.y, pos.pickedPoint.z); // Assuming pos is a Vector3 representing the center position
      // console.log(center)
      planes.forEach((pointsindex: any[], index: number) => {
          var points: BABYLON.Vector3[]=[]
          pointsindex.forEach((i) => {
            points.push(new BABYLON.Vector3(positionData[3 * i], positionData[3 * i + 1], positionData[3 * i + 2]));
          });
          const distance = calculateDistanceFromCenter(points, center);
          distances[index] = distance; // Assign the distance to the distances array
      });
      let minValue = distances[0]; // Initialize the minimum value with the first element of the array
      let minIndex = 0;
      for (let i = 1; i < distances.length; i++) {
          if (distances[i] < minValue) {
              minValue = distances[i]; // Update the minimum value
              minIndex = i; // Update the index of the minimum value
          }
      }
      if((pickedMesh.name==="Cylinder")&&(planes[minIndex]!==undefined)){
        var p: BABYLON.Vector3[]=[];
        planes[minIndex].forEach((i) => {
          p.push(new BABYLON.Vector3(positionData[3 * i], positionData[3 * i + 1], positionData[3 * i + 2]));
        });
        return {positions: p, shape: clone} ;        
      }
      else{
        clone.renderOverlay = true
        return {positions: resultPositions, shape: clone} ;
      }
  }
}
function ischeckonplane(items:any[],tess:any){
  const uniqueArray = items.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
  uniqueArray.sort((a, b) => a - b);
  // console.log(uniqueArray)
  if((uniqueArray[0]+parseInt(tess)+1===uniqueArray[2])&&(uniqueArray[1]+parseInt(tess)+1===uniqueArray[3]))return {status:true,val:uniqueArray};
  return {status:false,val:uniqueArray};
}
function dividePointsByPlanes(points: any[],tess:any): any[][] {
  const groups: any[][] = [];
  // console.log(points)
  if(tess>0){
    while(points.length>=2){
      var group = points.slice(0, 6);
      if(ischeckonplane(group,tess).status){
        groups.push(ischeckonplane(group,tess).val);
        points=points.slice(6);
      }
      else{
        // groups.push(group.slice(0,3));
        points=points.slice(3);
      }
    } 
  }  
  return groups;
}
function calculateDistanceFromCenter(pointArray: BABYLON.Vector3[], point:BABYLON.Vector3): number {
    // Calculate the centroid of the point array
    const centroid = new BABYLON.Vector3(0, 0, 0);
    for (const point of pointArray) {
        centroid.addInPlace(point);
    }
    centroid.scaleInPlace(1 / pointArray.length);

    // Calculate the distance between the centroid and the specific point (a, b, c)
    const distance = Math.sqrt(
        Math.pow(centroid.x - point.x, 2) +
        Math.pow(centroid.y - point.y, 2) +
        Math.pow(centroid.z - point.z, 2)
    );

    return distance;
}
export const pickedFacePoints = (mesh: any, searchIndex = null) => {
    if (!mesh){return; }

    var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions){return; }

    var numberOfPoints = positions.length / 3;

    var map: any = [];
    var globalPositions = [];
    if (!searchIndex) {
        for (let i = 0; i < numberOfPoints; i++) {
            var p = new BABYLON.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            let found = false;
            for (let j = 0; j < map.length && !found; j++) {
                var array = map[j];
                var p0 = array[0];
                if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                    found = true;
                }
            }
            if (!found) {
                globalPositions.push(BABYLON.Vector3.TransformCoordinates(p, mesh.getWorldMatrix()));
            }
        }
    } else {
        for (let i = 0; i < 3; i++) {
            var p1 = new BABYLON.Vector3(
                positions[(searchIndex + i) * 3],
                positions[(searchIndex + i) * 3 + 1],
                positions[(searchIndex + i) * 3 + 2]
            );
            let found = false;
            for (let j = 0; j < map.length && !found; j++) {
                var array1 = map[j];
                var p01 = array1[0];
                if (p01.equals(p1) || (p01.subtract(p1)).lengthSquared() < 0.01) {
                    found = true;
                }
            }
            if (!found) {
                globalPositions.push(BABYLON.Vector3.TransformCoordinates(p1, mesh.getWorldMatrix()));
            }
        }
    }
    return globalPositions ;
}

export const computeNormal = (points: any) => {
  let v1 = points[1].subtract(points[0]);
  let v2 = points[2].subtract(points[0]);
  let normal = BABYLON.Vector3.Cross(v1, v2).normalize();
  // Step 2: Calculate rotation axis and angle
  let zAxis = new BABYLON.Vector3(0, 0, 1);
  let rotationAxis = BABYLON.Vector3.Cross(normal, zAxis).normalize();
  let angle = Math.acos(BABYLON.Vector3.Dot(normal, zAxis) / (normal.length() * zAxis.length()));
  
  // Step 3: Apply the rotation to all points
  let quaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, angle);
  let rotatedPoints = points.map((point: any) => point.rotateByQuaternionAroundPointToRef(quaternion, BABYLON.Vector3.Zero(), new BABYLON.Vector3()));
  return rotatedPoints;
}