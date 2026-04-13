function calculateRisk(density) {
    return density > 7 ? "HIGH" : "SAFE";
}

module.exports = calculateRisk;