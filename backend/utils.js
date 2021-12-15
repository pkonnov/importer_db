
export class SetOperation{
    static union(setA, setB) {
        const _union = new Set(setA);
        for (const elem of setB) {
            _union.add(elem);
        }
        return new Array(_union);
    }

    static intersection(setA, setB) {
        const _intersection = new Set();
        const _setA = new Set(setA)
        for (const elem of setB) {
            if (_setA.has(elem)) {
                _intersection.add(elem);
            }
        }
        return new Array(..._intersection);
    }

    static difference(setA, setB) {
        const _difference = new Set(setA);
        for (const elem of setB) {
            _difference.delete(elem);
        }
        return new Array(..._difference);
    }

    static differenceObj(setA, setB) {
        const _difference = new Set(setA.map(el => JSON.stringify(el)));
        const s = new Set(setB.map(el => JSON.stringify(el)))
        s.forEach((obj) => {
            _difference.delete(obj);
        })
        return new Array(..._difference);
    }
}
