function combine(x: number, list: number[]): number[][] {
    if (x === 0) {
        return [[]];
    } else if (x === 1) {
        return list.map(e => [e]);
    } else {
        const combinations: number[][] = [];
        for (let i = 0; i < list.length; i++) {
            for (const subcombination of combine(x - 1, list.slice(i + 1))) {
                combinations.push([list[i], ...subcombination]);
            }
        }
        return combinations;
    }
}
