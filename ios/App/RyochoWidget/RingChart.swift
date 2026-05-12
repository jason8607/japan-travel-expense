import SwiftUI

struct RingChart: View {
    let slices: [CategorySlice]
    var lineWidth: CGFloat = 10

    var body: some View {
        Canvas { context, size in
            let total = slices.map(\.amountJpy).reduce(0, +)
            let trackRect = CGRect(origin: .zero, size: size)
                .insetBy(dx: lineWidth / 2, dy: lineWidth / 2)
            let radius = min(trackRect.width, trackRect.height) / 2
            let center = CGPoint(x: trackRect.midX, y: trackRect.midY)

            var trackPath = Path()
            trackPath.addArc(
                center: center,
                radius: radius,
                startAngle: .degrees(0),
                endAngle: .degrees(360),
                clockwise: false
            )
            context.stroke(
                trackPath,
                with: .color(Color.secondary.opacity(0.15)),
                style: StrokeStyle(lineWidth: lineWidth)
            )

            guard total > 0 else { return }
            var startAngle = Angle.degrees(-90)
            for slice in slices {
                let sweep = Angle.degrees(360 * (slice.amountJpy / total))
                var path = Path()
                path.addArc(
                    center: center,
                    radius: radius,
                    startAngle: startAngle,
                    endAngle: startAngle + sweep,
                    clockwise: false
                )
                context.stroke(
                    path,
                    with: .color(Color(hex: slice.color)),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt)
                )
                startAngle += sweep
            }
        }
    }
}
