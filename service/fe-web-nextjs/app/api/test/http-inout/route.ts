import {NextRequest, NextResponse} from "next/server";

export async function GET() {
    return NextResponse.json({status: "UP"});
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    return NextResponse.json({received: body});
}


